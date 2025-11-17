"""Data source implementation for mock task data."""

import asyncio
import logging
import time
from typing import Dict, cast

from app.config.constants import TARGET_FPS
from app.proto import FFTFrame, SpectralMessage
from app.sources.base import DataSource
from app.sources.types import SourceType
from app.utils.fft_generator import MockFFTGenerator
from app.utils.spectral_conversion import db_bins_to_bytes

logger = logging.getLogger(__name__)


class MockTaskDataSource(DataSource):
    """
    Data source that generates mock FFT data for a task.

    Wraps MockFFTGenerator and follows the source lifecycle.
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
        source_id = f"{task_id}-raw"

        metadata: Dict = {
            "type": SourceType.RAW,
            "type_label": "Raw",
            "centerFrequency": center_freq,
            "sampleRate": sample_rate,
            "fftSize": fft_size,
            "parentTaskId": task_id,
        }

        super().__init__(
            source_id=source_id,
            name=f"{task_name} - Raw IQ",
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

        Runs at TARGET_FPS, serializes once per frame, fans out to subscribers.
        """
        logger.info(f"MockTaskDataSource {self.id}: Starting production at {self.target_fps} FPS")

        frame_count = 0

        try:
            while self._attached:
                t1 = time.time()

                # Generate FFT data
                fft_data = self.generator.generate_fft()

                # Serialize once (protobuf + compression)
                serialized = self._serialize_frame(fft_data)

                # Fan out to all subscribers (non-blocking)
                await self.publish(serialized)

                frame_count += 1
                if frame_count % 300 == 0:  # Log every 5 seconds at 60 FPS
                    logger.debug(
                        f"MockTaskDataSource {self.id}: Sent {frame_count} frames "
                        f"to {self.subscriber_count} subscribers"
                    )

                # Sleep to maintain target FPS
                t2 = time.time()
                elapsed = t2 - t1
                sleep_time = max(0, self.frame_interval - elapsed)
                await asyncio.sleep(sleep_time)

        except asyncio.CancelledError:
            logger.info(
                f"MockTaskDataSource {self.id}: Production stopped " f"(sent {frame_count} frames)"
            )
            raise
        except Exception as e:
            logger.error(
                f"MockTaskDataSource {self.id}: Error in production loop: {e}",
                exc_info=True,
            )
            raise

    def _serialize_frame(self, fft_data: dict) -> bytes:
        """
        Serialize FFT data to protobuf.

        Args:
            fft_data: Dict with timestamp, centerFreq, sampleRate, bins

        Returns:
            Serialized SpectralMessage bytes
        """
        # Convert to protobuf FFTFrame (single frame mode)
        proto_frame = FFTFrame(
            timestamp=fft_data["timestamp"],
            center_freq=fft_data["centerFreq"],
            sample_rate=fft_data["sampleRate"],
            bins=db_bins_to_bytes(fft_data["bins"]),
        )

        # Wrap in SpectralMessage
        message = SpectralMessage(type=SpectralMessage.SINGLE_FRAME, single_frame=proto_frame)

        # Serialize to bytes
        return cast(bytes, message.SerializeToString())
