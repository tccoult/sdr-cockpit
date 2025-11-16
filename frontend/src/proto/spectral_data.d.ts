import * as $protobuf from "protobufjs";
import Long = require("long");
/** Namespace sdr_cockpit. */
export namespace sdr_cockpit {

    /** Properties of a FFTFrame. */
    interface IFFTFrame {

        /** FFTFrame timestamp */
        timestamp?: (number|Long|null);

        /** FFTFrame centerFreq */
        centerFreq?: (number|null);

        /** FFTFrame sampleRate */
        sampleRate?: (number|null);

        /** FFTFrame bins */
        bins?: (Uint8Array|null);

        /** FFTFrame isDelta */
        isDelta?: (boolean|null);
    }

    /** Represents a FFTFrame. */
    class FFTFrame implements IFFTFrame {

        /**
         * Constructs a new FFTFrame.
         * @param [properties] Properties to set
         */
        constructor(properties?: sdr_cockpit.IFFTFrame);

        /** FFTFrame timestamp. */
        public timestamp: (number|Long);

        /** FFTFrame centerFreq. */
        public centerFreq: number;

        /** FFTFrame sampleRate. */
        public sampleRate: number;

        /** FFTFrame bins. */
        public bins: Uint8Array;

        /** FFTFrame isDelta. */
        public isDelta: boolean;

        /**
         * Creates a new FFTFrame instance using the specified properties.
         * @param [properties] Properties to set
         * @returns FFTFrame instance
         */
        public static create(properties?: sdr_cockpit.IFFTFrame): sdr_cockpit.FFTFrame;

        /**
         * Encodes the specified FFTFrame message. Does not implicitly {@link sdr_cockpit.FFTFrame.verify|verify} messages.
         * @param message FFTFrame message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: sdr_cockpit.IFFTFrame, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified FFTFrame message, length delimited. Does not implicitly {@link sdr_cockpit.FFTFrame.verify|verify} messages.
         * @param message FFTFrame message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: sdr_cockpit.IFFTFrame, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a FFTFrame message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns FFTFrame
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): sdr_cockpit.FFTFrame;

        /**
         * Decodes a FFTFrame message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns FFTFrame
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): sdr_cockpit.FFTFrame;

        /**
         * Verifies a FFTFrame message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a FFTFrame message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns FFTFrame
         */
        public static fromObject(object: { [k: string]: any }): sdr_cockpit.FFTFrame;

        /**
         * Creates a plain object from a FFTFrame message. Also converts values to other types if specified.
         * @param message FFTFrame
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: sdr_cockpit.FFTFrame, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this FFTFrame to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for FFTFrame
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a FFTFrameBatch. */
    interface IFFTFrameBatch {

        /** FFTFrameBatch frames */
        frames?: (sdr_cockpit.IFFTFrame[]|null);

        /** FFTFrameBatch batchTimestamp */
        batchTimestamp?: (number|Long|null);

        /** FFTFrameBatch centerFreq */
        centerFreq?: (number|null);

        /** FFTFrameBatch sampleRate */
        sampleRate?: (number|null);
    }

    /** Represents a FFTFrameBatch. */
    class FFTFrameBatch implements IFFTFrameBatch {

        /**
         * Constructs a new FFTFrameBatch.
         * @param [properties] Properties to set
         */
        constructor(properties?: sdr_cockpit.IFFTFrameBatch);

        /** FFTFrameBatch frames. */
        public frames: sdr_cockpit.IFFTFrame[];

        /** FFTFrameBatch batchTimestamp. */
        public batchTimestamp?: (number|Long|null);

        /** FFTFrameBatch centerFreq. */
        public centerFreq?: (number|null);

        /** FFTFrameBatch sampleRate. */
        public sampleRate?: (number|null);

        /** FFTFrameBatch _batchTimestamp. */
        public _batchTimestamp?: "batchTimestamp";

        /** FFTFrameBatch _centerFreq. */
        public _centerFreq?: "centerFreq";

        /** FFTFrameBatch _sampleRate. */
        public _sampleRate?: "sampleRate";

        /**
         * Creates a new FFTFrameBatch instance using the specified properties.
         * @param [properties] Properties to set
         * @returns FFTFrameBatch instance
         */
        public static create(properties?: sdr_cockpit.IFFTFrameBatch): sdr_cockpit.FFTFrameBatch;

        /**
         * Encodes the specified FFTFrameBatch message. Does not implicitly {@link sdr_cockpit.FFTFrameBatch.verify|verify} messages.
         * @param message FFTFrameBatch message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: sdr_cockpit.IFFTFrameBatch, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified FFTFrameBatch message, length delimited. Does not implicitly {@link sdr_cockpit.FFTFrameBatch.verify|verify} messages.
         * @param message FFTFrameBatch message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: sdr_cockpit.IFFTFrameBatch, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a FFTFrameBatch message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns FFTFrameBatch
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): sdr_cockpit.FFTFrameBatch;

        /**
         * Decodes a FFTFrameBatch message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns FFTFrameBatch
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): sdr_cockpit.FFTFrameBatch;

        /**
         * Verifies a FFTFrameBatch message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a FFTFrameBatch message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns FFTFrameBatch
         */
        public static fromObject(object: { [k: string]: any }): sdr_cockpit.FFTFrameBatch;

        /**
         * Creates a plain object from a FFTFrameBatch message. Also converts values to other types if specified.
         * @param message FFTFrameBatch
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: sdr_cockpit.FFTFrameBatch, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this FFTFrameBatch to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for FFTFrameBatch
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a SpectralMessage. */
    interface ISpectralMessage {

        /** SpectralMessage type */
        type?: (sdr_cockpit.SpectralMessage.MessageType|null);

        /** SpectralMessage singleFrame */
        singleFrame?: (sdr_cockpit.IFFTFrame|null);

        /** SpectralMessage batch */
        batch?: (sdr_cockpit.IFFTFrameBatch|null);

        /** SpectralMessage compressedData */
        compressedData?: (Uint8Array|null);
    }

    /** Represents a SpectralMessage. */
    class SpectralMessage implements ISpectralMessage {

        /**
         * Constructs a new SpectralMessage.
         * @param [properties] Properties to set
         */
        constructor(properties?: sdr_cockpit.ISpectralMessage);

        /** SpectralMessage type. */
        public type: sdr_cockpit.SpectralMessage.MessageType;

        /** SpectralMessage singleFrame. */
        public singleFrame?: (sdr_cockpit.IFFTFrame|null);

        /** SpectralMessage batch. */
        public batch?: (sdr_cockpit.IFFTFrameBatch|null);

        /** SpectralMessage compressedData. */
        public compressedData?: (Uint8Array|null);

        /** SpectralMessage payload. */
        public payload?: ("singleFrame"|"batch"|"compressedData");

        /**
         * Creates a new SpectralMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SpectralMessage instance
         */
        public static create(properties?: sdr_cockpit.ISpectralMessage): sdr_cockpit.SpectralMessage;

        /**
         * Encodes the specified SpectralMessage message. Does not implicitly {@link sdr_cockpit.SpectralMessage.verify|verify} messages.
         * @param message SpectralMessage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: sdr_cockpit.ISpectralMessage, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SpectralMessage message, length delimited. Does not implicitly {@link sdr_cockpit.SpectralMessage.verify|verify} messages.
         * @param message SpectralMessage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: sdr_cockpit.ISpectralMessage, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SpectralMessage message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SpectralMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): sdr_cockpit.SpectralMessage;

        /**
         * Decodes a SpectralMessage message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns SpectralMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): sdr_cockpit.SpectralMessage;

        /**
         * Verifies a SpectralMessage message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SpectralMessage message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SpectralMessage
         */
        public static fromObject(object: { [k: string]: any }): sdr_cockpit.SpectralMessage;

        /**
         * Creates a plain object from a SpectralMessage message. Also converts values to other types if specified.
         * @param message SpectralMessage
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: sdr_cockpit.SpectralMessage, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SpectralMessage to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for SpectralMessage
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace SpectralMessage {

        /** MessageType enum. */
        enum MessageType {
            SINGLE_FRAME = 0,
            BATCH = 1,
            COMPRESSED_BATCH = 2
        }
    }
}
