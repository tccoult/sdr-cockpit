# API Schemas

This directory contains API schema definitions for SDR Cockpit.

## Contents

- **`spectral_data.proto`** - Protobuf schema for binary spectral data streaming

## Type Generation

To regenerate TypeScript and Python code from schemas:

```bash
./scripts/generate-types.sh
```

This will:
1. Generate Python protobuf code → `backend/app/proto/`
2. Generate TypeScript protobuf code → `frontend/src/proto/`
3. (Future) Generate TypeScript types from OpenAPI schema

## Protobuf Schema

The `spectral_data.proto` file defines the binary format for FFT spectral data:

- **FFTFrame** - Single FFT frame with int16 log magnitude bins
- **FFTFrameBatch** - Batch of frames for spectrogram streaming
- **SpectralMessage** - Wrapper with message type discrimination

### Message Types

- `SINGLE_FRAME` - For FFT_ONLY / FFT_WATERFALL modes (60 FPS)
- `BATCH` - For SPECTROGRAM mode (uncompressed batches)
- `COMPRESSED_BATCH` - For SPECTROGRAM mode (zstd compressed batches)

### Int16 Encoding

FFT bins are encoded as int16 log magnitude:
- dB range: -120 dB to +10 dB (130 dB dynamic range)
- Int16 range: -32768 to 32767
- Resolution: ~0.002 dB per step

## Future: OpenAPI Schema

Consider adding OpenAPI schema export from FastAPI for automatic TypeScript type generation.
