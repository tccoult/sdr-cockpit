"""Data source implementation for mock task data."""

import asyncio
import logging
import time
from typing import Dict, Optional, cast

import numpy as np

from app.config.constants import TARGET_FPS
from app.models.generated import TaskStatus, VisualizationMode
from app.proto import FFTFrame, FFTFrameBatch, SpectralMessage
from app.sources.base import DataSource
from app.utils.compression import compress_data_timed, should_compress_batch
from app.utils.fft_generator import MockFFTGenerator
from app.utils.spectral_conversion import (
    bins_to_bytes,
    compute_delta_frame,
    db_bins_to_bytes,
    db_to_int16,
)

logger = logging.getLogger(__name__)


class MockTaskDataSource(DataSource):
    """
    Data source that generates mock FFT data for a task.

    Wraps MockFFTGenerator and follows the source lifecycle.
    Handles visualization mode-specific batching and compression.
    """

    def __init__(
        self,
        task_id: str,
        task_name: str,
        center_freq: float,
        sample_rate: float,
        fft_size: int = 2048,
    ):
        """
        Initialize mock task data source.

        Args:
            task_id: ID of the parent task
            task_name: Name of the task
            center_freq: Center frequency in Hz
            sample_rate: Sample rate in Hz
            fft_size: FFT size (number of bins)
        """
        source_id = f"{task_id}-spectral"

        metadata: Dict = {
            "type": "spectral",
            "type_label": "Spectral",
            "centerFrequency": center_freq,
            "sampleRate": sample_rate,
            "fftSize": fft_size,
            "parentTaskId": task_id,
        }

        super().__init__(
            source_id=source_id,
            name=f"{task_name} - Spectral",
            metadata=metadata,
        )

        # FFT generation
        self.task_id = task_id
        self.generator = MockFFTGenerator(
            center_freq=center_freq,
            sample_rate=sample_rate,
            fft_size=fft_size,
            seed=hash(task_id) % 10000,
        )

        # Frame timing
        self.target_fps = TARGET_FPS
        self.frame_interval = 1.0 / self.target_fps

    async def _produce_loop(self) -> None:
        """
        Generate and publish mock FFT data.

        Adapts behavior based on visualization mode:
        - FFT/Waterfall: Single frames at 60 FPS
        - Spectrogram: Batches of 256 frames with delta encoding + compression
        """
        from app.api.routes.tasks import tasks

        logger.info(f"MockTaskDataSource {self.id}: Starting production at {self.target_fps} FPS")

        frame_count = 0

        try:
            while self._attached:
                # Check task status and visualization mode
                if self.task_id not in tasks:
                    logger.warning(f"Task {self.task_id} no longer exists, stopping production")
                    break

                task = tasks[self.task_id]

                # Only produce if task is active
                if task.status not in [TaskStatus.live, TaskStatus.transmitting]:
                    await asyncio.sleep(0.1)  # Check again soon
                    continue

                t1 = time.time()

                # Generate based on visualization mode
                if task.visualization_mode == VisualizationMode.spectrogram:
                    # Spectrogram: Generate batch of 256 frames
                    serialized = self._serialize_batch(batch_size=256)
                else:
                    # FFT/Waterfall: Generate single frame
                    fft_data = self.generator.generate_fft()
                    serialized = self._serialize_single_frame(fft_data)

                # Fan out to all subscribers (non-blocking)
                await self.publish(serialized)

                frame_count += 1
                if frame_count % 60 == 0:  # Log every second
                    logger.debug(
                        f"MockTaskDataSource {self.id}: Sent {frame_count} frames/batches "
                        f"to {self.subscriber_count} subscribers (mode: {task.visualization_mode})"
                    )

                # Sleep to maintain target FPS
                t2 = time.time()
                elapsed = t2 - t1
                sleep_time = max(0, self.frame_interval - elapsed)
                await asyncio.sleep(sleep_time)

        except asyncio.CancelledError:
            logger.info(
                f"MockTaskDataSource {self.id}: Production stopped (sent {frame_count} frames/batches)"
            )
            raise
        except Exception as e:
            logger.error(
                f"MockTaskDataSource {self.id}: Error in production loop: {e}",
                exc_info=True,
            )
            raise

    def _serialize_single_frame(self, fft_data: dict) -> bytes:
        """
        Serialize single FFT frame to protobuf (for FFT/Waterfall modes).

        Args:
            fft_data: Dict with timestamp, centerFreq, sampleRate, bins

        Returns:
            Serialized SpectralMessage bytes
        """
        proto_frame = FFTFrame(
            timestamp=fft_data["timestamp"],
            center_freq=fft_data["centerFreq"],
            sample_rate=fft_data["sampleRate"],
            bins=db_bins_to_bytes(fft_data["bins"]),
        )

        message = SpectralMessage(type=SpectralMessage.SINGLE_FRAME, single_frame=proto_frame)
        return cast(bytes, message.SerializeToString())

    def _serialize_batch(self, batch_size: int = 256) -> bytes:
        """
        Serialize batch of FFT frames with delta encoding + compression (for Spectrogram mode).

        Args:
            batch_size: Number of frames in batch (default 256)

        Returns:
            Serialized SpectralMessage bytes (compressed batch)
        """
        proto_frames = []
        use_delta_encoding = should_compress_batch(batch_size)
        previous_int16: Optional[np.ndarray] = None

        for i in range(batch_size):
            fft_data = self.generator.generate_fft()

            # Convert to int16
            current_int16 = db_to_int16(fft_data["bins"])

            # Use delta encoding only if we're going to compress
            if use_delta_encoding and i > 0:
                # Subsequent frames: send delta from previous
                assert previous_int16 is not None
                delta = compute_delta_frame(current_int16, previous_int16)
                bins_data = bins_to_bytes(delta)
                is_delta = True
            else:
                # First frame or no compression: send absolute values
                bins_data = bins_to_bytes(current_int16)
                is_delta = False

            proto_frame = FFTFrame(
                timestamp=fft_data["timestamp"],
                center_freq=fft_data["centerFreq"],
                sample_rate=fft_data["sampleRate"],
                bins=bins_data,
                is_delta=is_delta,
            )
            proto_frames.append(proto_frame)

            # Store for next delta
            previous_int16 = current_int16

        # Create batch message
        batch = FFTFrameBatch(frames=proto_frames)
        batch_bytes = batch.SerializeToString()

        # Compress if batch is large enough
        if should_compress_batch(batch_size):
            compressed_bytes, _ = compress_data_timed(batch_bytes)
            message = SpectralMessage(
                type=SpectralMessage.COMPRESSED_BATCH,
                compressed_data=compressed_bytes,
            )
        else:
            message = SpectralMessage(type=SpectralMessage.BATCH, batch=batch)

        return cast(bytes, message.SerializeToString())
