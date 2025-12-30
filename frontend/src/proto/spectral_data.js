/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
import * as $protobuf from "protobufjs/minimal";

// Common aliases
const $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
const $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

export const sdr_cockpit = $root.sdr_cockpit = (() => {

    /**
     * Namespace sdr_cockpit.
     * @exports sdr_cockpit
     * @namespace
     */
    const sdr_cockpit = {};

    sdr_cockpit.FFTFrame = (function() {

        /**
         * Properties of a FFTFrame.
         * @memberof sdr_cockpit
         * @interface IFFTFrame
         * @property {number|Long|null} [timestamp] FFTFrame timestamp
         * @property {number|null} [centerFreq] FFTFrame centerFreq
         * @property {number|null} [sampleRate] FFTFrame sampleRate
         * @property {Uint8Array|null} [bins] FFTFrame bins
         * @property {boolean|null} [isDelta] FFTFrame isDelta
         */

        /**
         * Constructs a new FFTFrame.
         * @memberof sdr_cockpit
         * @classdesc Represents a FFTFrame.
         * @implements IFFTFrame
         * @constructor
         * @param {sdr_cockpit.IFFTFrame=} [properties] Properties to set
         */
        function FFTFrame(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * FFTFrame timestamp.
         * @member {number|Long} timestamp
         * @memberof sdr_cockpit.FFTFrame
         * @instance
         */
        FFTFrame.prototype.timestamp = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

        /**
         * FFTFrame centerFreq.
         * @member {number} centerFreq
         * @memberof sdr_cockpit.FFTFrame
         * @instance
         */
        FFTFrame.prototype.centerFreq = 0;

        /**
         * FFTFrame sampleRate.
         * @member {number} sampleRate
         * @memberof sdr_cockpit.FFTFrame
         * @instance
         */
        FFTFrame.prototype.sampleRate = 0;

        /**
         * FFTFrame bins.
         * @member {Uint8Array} bins
         * @memberof sdr_cockpit.FFTFrame
         * @instance
         */
        FFTFrame.prototype.bins = $util.newBuffer([]);

        /**
         * FFTFrame isDelta.
         * @member {boolean} isDelta
         * @memberof sdr_cockpit.FFTFrame
         * @instance
         */
        FFTFrame.prototype.isDelta = false;

        /**
         * Creates a new FFTFrame instance using the specified properties.
         * @function create
         * @memberof sdr_cockpit.FFTFrame
         * @static
         * @param {sdr_cockpit.IFFTFrame=} [properties] Properties to set
         * @returns {sdr_cockpit.FFTFrame} FFTFrame instance
         */
        FFTFrame.create = function create(properties) {
            return new FFTFrame(properties);
        };

        /**
         * Encodes the specified FFTFrame message. Does not implicitly {@link sdr_cockpit.FFTFrame.verify|verify} messages.
         * @function encode
         * @memberof sdr_cockpit.FFTFrame
         * @static
         * @param {sdr_cockpit.IFFTFrame} message FFTFrame message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        FFTFrame.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.timestamp != null && Object.hasOwnProperty.call(message, "timestamp"))
                writer.uint32(/* id 1, wireType 0 =*/8).uint64(message.timestamp);
            if (message.centerFreq != null && Object.hasOwnProperty.call(message, "centerFreq"))
                writer.uint32(/* id 2, wireType 1 =*/17).double(message.centerFreq);
            if (message.sampleRate != null && Object.hasOwnProperty.call(message, "sampleRate"))
                writer.uint32(/* id 3, wireType 1 =*/25).double(message.sampleRate);
            if (message.bins != null && Object.hasOwnProperty.call(message, "bins"))
                writer.uint32(/* id 4, wireType 2 =*/34).bytes(message.bins);
            if (message.isDelta != null && Object.hasOwnProperty.call(message, "isDelta"))
                writer.uint32(/* id 5, wireType 0 =*/40).bool(message.isDelta);
            return writer;
        };

        /**
         * Encodes the specified FFTFrame message, length delimited. Does not implicitly {@link sdr_cockpit.FFTFrame.verify|verify} messages.
         * @function encodeDelimited
         * @memberof sdr_cockpit.FFTFrame
         * @static
         * @param {sdr_cockpit.IFFTFrame} message FFTFrame message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        FFTFrame.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a FFTFrame message from the specified reader or buffer.
         * @function decode
         * @memberof sdr_cockpit.FFTFrame
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {sdr_cockpit.FFTFrame} FFTFrame
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        FFTFrame.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.sdr_cockpit.FFTFrame();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.timestamp = reader.uint64();
                        break;
                    }
                case 2: {
                        message.centerFreq = reader.double();
                        break;
                    }
                case 3: {
                        message.sampleRate = reader.double();
                        break;
                    }
                case 4: {
                        message.bins = reader.bytes();
                        break;
                    }
                case 5: {
                        message.isDelta = reader.bool();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a FFTFrame message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof sdr_cockpit.FFTFrame
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {sdr_cockpit.FFTFrame} FFTFrame
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        FFTFrame.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a FFTFrame message.
         * @function verify
         * @memberof sdr_cockpit.FFTFrame
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        FFTFrame.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.timestamp != null && message.hasOwnProperty("timestamp"))
                if (!$util.isInteger(message.timestamp) && !(message.timestamp && $util.isInteger(message.timestamp.low) && $util.isInteger(message.timestamp.high)))
                    return "timestamp: integer|Long expected";
            if (message.centerFreq != null && message.hasOwnProperty("centerFreq"))
                if (typeof message.centerFreq !== "number")
                    return "centerFreq: number expected";
            if (message.sampleRate != null && message.hasOwnProperty("sampleRate"))
                if (typeof message.sampleRate !== "number")
                    return "sampleRate: number expected";
            if (message.bins != null && message.hasOwnProperty("bins"))
                if (!(message.bins && typeof message.bins.length === "number" || $util.isString(message.bins)))
                    return "bins: buffer expected";
            if (message.isDelta != null && message.hasOwnProperty("isDelta"))
                if (typeof message.isDelta !== "boolean")
                    return "isDelta: boolean expected";
            return null;
        };

        /**
         * Creates a FFTFrame message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof sdr_cockpit.FFTFrame
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {sdr_cockpit.FFTFrame} FFTFrame
         */
        FFTFrame.fromObject = function fromObject(object) {
            if (object instanceof $root.sdr_cockpit.FFTFrame)
                return object;
            let message = new $root.sdr_cockpit.FFTFrame();
            if (object.timestamp != null)
                if ($util.Long)
                    (message.timestamp = $util.Long.fromValue(object.timestamp)).unsigned = true;
                else if (typeof object.timestamp === "string")
                    message.timestamp = parseInt(object.timestamp, 10);
                else if (typeof object.timestamp === "number")
                    message.timestamp = object.timestamp;
                else if (typeof object.timestamp === "object")
                    message.timestamp = new $util.LongBits(object.timestamp.low >>> 0, object.timestamp.high >>> 0).toNumber(true);
            if (object.centerFreq != null)
                message.centerFreq = Number(object.centerFreq);
            if (object.sampleRate != null)
                message.sampleRate = Number(object.sampleRate);
            if (object.bins != null)
                if (typeof object.bins === "string")
                    $util.base64.decode(object.bins, message.bins = $util.newBuffer($util.base64.length(object.bins)), 0);
                else if (object.bins.length >= 0)
                    message.bins = object.bins;
            if (object.isDelta != null)
                message.isDelta = Boolean(object.isDelta);
            return message;
        };

        /**
         * Creates a plain object from a FFTFrame message. Also converts values to other types if specified.
         * @function toObject
         * @memberof sdr_cockpit.FFTFrame
         * @static
         * @param {sdr_cockpit.FFTFrame} message FFTFrame
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        FFTFrame.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                if ($util.Long) {
                    let long = new $util.Long(0, 0, true);
                    object.timestamp = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.timestamp = options.longs === String ? "0" : 0;
                object.centerFreq = 0;
                object.sampleRate = 0;
                if (options.bytes === String)
                    object.bins = "";
                else {
                    object.bins = [];
                    if (options.bytes !== Array)
                        object.bins = $util.newBuffer(object.bins);
                }
                object.isDelta = false;
            }
            if (message.timestamp != null && message.hasOwnProperty("timestamp"))
                if (typeof message.timestamp === "number")
                    object.timestamp = options.longs === String ? String(message.timestamp) : message.timestamp;
                else
                    object.timestamp = options.longs === String ? $util.Long.prototype.toString.call(message.timestamp) : options.longs === Number ? new $util.LongBits(message.timestamp.low >>> 0, message.timestamp.high >>> 0).toNumber(true) : message.timestamp;
            if (message.centerFreq != null && message.hasOwnProperty("centerFreq"))
                object.centerFreq = options.json && !isFinite(message.centerFreq) ? String(message.centerFreq) : message.centerFreq;
            if (message.sampleRate != null && message.hasOwnProperty("sampleRate"))
                object.sampleRate = options.json && !isFinite(message.sampleRate) ? String(message.sampleRate) : message.sampleRate;
            if (message.bins != null && message.hasOwnProperty("bins"))
                object.bins = options.bytes === String ? $util.base64.encode(message.bins, 0, message.bins.length) : options.bytes === Array ? Array.prototype.slice.call(message.bins) : message.bins;
            if (message.isDelta != null && message.hasOwnProperty("isDelta"))
                object.isDelta = message.isDelta;
            return object;
        };

        /**
         * Converts this FFTFrame to JSON.
         * @function toJSON
         * @memberof sdr_cockpit.FFTFrame
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        FFTFrame.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for FFTFrame
         * @function getTypeUrl
         * @memberof sdr_cockpit.FFTFrame
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        FFTFrame.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/sdr_cockpit.FFTFrame";
        };

        return FFTFrame;
    })();

    sdr_cockpit.FFTFrameBatch = (function() {

        /**
         * Properties of a FFTFrameBatch.
         * @memberof sdr_cockpit
         * @interface IFFTFrameBatch
         * @property {Array.<sdr_cockpit.IFFTFrame>|null} [frames] FFTFrameBatch frames
         * @property {number|Long|null} [batchTimestamp] FFTFrameBatch batchTimestamp
         * @property {number|null} [centerFreq] FFTFrameBatch centerFreq
         * @property {number|null} [sampleRate] FFTFrameBatch sampleRate
         */

        /**
         * Constructs a new FFTFrameBatch.
         * @memberof sdr_cockpit
         * @classdesc Represents a FFTFrameBatch.
         * @implements IFFTFrameBatch
         * @constructor
         * @param {sdr_cockpit.IFFTFrameBatch=} [properties] Properties to set
         */
        function FFTFrameBatch(properties) {
            this.frames = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * FFTFrameBatch frames.
         * @member {Array.<sdr_cockpit.IFFTFrame>} frames
         * @memberof sdr_cockpit.FFTFrameBatch
         * @instance
         */
        FFTFrameBatch.prototype.frames = $util.emptyArray;

        /**
         * FFTFrameBatch batchTimestamp.
         * @member {number|Long|null|undefined} batchTimestamp
         * @memberof sdr_cockpit.FFTFrameBatch
         * @instance
         */
        FFTFrameBatch.prototype.batchTimestamp = null;

        /**
         * FFTFrameBatch centerFreq.
         * @member {number|null|undefined} centerFreq
         * @memberof sdr_cockpit.FFTFrameBatch
         * @instance
         */
        FFTFrameBatch.prototype.centerFreq = null;

        /**
         * FFTFrameBatch sampleRate.
         * @member {number|null|undefined} sampleRate
         * @memberof sdr_cockpit.FFTFrameBatch
         * @instance
         */
        FFTFrameBatch.prototype.sampleRate = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        // Virtual OneOf for proto3 optional field
        Object.defineProperty(FFTFrameBatch.prototype, "_batchTimestamp", {
            get: $util.oneOfGetter($oneOfFields = ["batchTimestamp"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        // Virtual OneOf for proto3 optional field
        Object.defineProperty(FFTFrameBatch.prototype, "_centerFreq", {
            get: $util.oneOfGetter($oneOfFields = ["centerFreq"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        // Virtual OneOf for proto3 optional field
        Object.defineProperty(FFTFrameBatch.prototype, "_sampleRate", {
            get: $util.oneOfGetter($oneOfFields = ["sampleRate"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Creates a new FFTFrameBatch instance using the specified properties.
         * @function create
         * @memberof sdr_cockpit.FFTFrameBatch
         * @static
         * @param {sdr_cockpit.IFFTFrameBatch=} [properties] Properties to set
         * @returns {sdr_cockpit.FFTFrameBatch} FFTFrameBatch instance
         */
        FFTFrameBatch.create = function create(properties) {
            return new FFTFrameBatch(properties);
        };

        /**
         * Encodes the specified FFTFrameBatch message. Does not implicitly {@link sdr_cockpit.FFTFrameBatch.verify|verify} messages.
         * @function encode
         * @memberof sdr_cockpit.FFTFrameBatch
         * @static
         * @param {sdr_cockpit.IFFTFrameBatch} message FFTFrameBatch message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        FFTFrameBatch.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.frames != null && message.frames.length)
                for (let i = 0; i < message.frames.length; ++i)
                    $root.sdr_cockpit.FFTFrame.encode(message.frames[i], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.batchTimestamp != null && Object.hasOwnProperty.call(message, "batchTimestamp"))
                writer.uint32(/* id 2, wireType 0 =*/16).uint64(message.batchTimestamp);
            if (message.centerFreq != null && Object.hasOwnProperty.call(message, "centerFreq"))
                writer.uint32(/* id 3, wireType 1 =*/25).double(message.centerFreq);
            if (message.sampleRate != null && Object.hasOwnProperty.call(message, "sampleRate"))
                writer.uint32(/* id 4, wireType 1 =*/33).double(message.sampleRate);
            return writer;
        };

        /**
         * Encodes the specified FFTFrameBatch message, length delimited. Does not implicitly {@link sdr_cockpit.FFTFrameBatch.verify|verify} messages.
         * @function encodeDelimited
         * @memberof sdr_cockpit.FFTFrameBatch
         * @static
         * @param {sdr_cockpit.IFFTFrameBatch} message FFTFrameBatch message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        FFTFrameBatch.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a FFTFrameBatch message from the specified reader or buffer.
         * @function decode
         * @memberof sdr_cockpit.FFTFrameBatch
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {sdr_cockpit.FFTFrameBatch} FFTFrameBatch
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        FFTFrameBatch.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.sdr_cockpit.FFTFrameBatch();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        if (!(message.frames && message.frames.length))
                            message.frames = [];
                        message.frames.push($root.sdr_cockpit.FFTFrame.decode(reader, reader.uint32()));
                        break;
                    }
                case 2: {
                        message.batchTimestamp = reader.uint64();
                        break;
                    }
                case 3: {
                        message.centerFreq = reader.double();
                        break;
                    }
                case 4: {
                        message.sampleRate = reader.double();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a FFTFrameBatch message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof sdr_cockpit.FFTFrameBatch
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {sdr_cockpit.FFTFrameBatch} FFTFrameBatch
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        FFTFrameBatch.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a FFTFrameBatch message.
         * @function verify
         * @memberof sdr_cockpit.FFTFrameBatch
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        FFTFrameBatch.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            let properties = {};
            if (message.frames != null && message.hasOwnProperty("frames")) {
                if (!Array.isArray(message.frames))
                    return "frames: array expected";
                for (let i = 0; i < message.frames.length; ++i) {
                    let error = $root.sdr_cockpit.FFTFrame.verify(message.frames[i]);
                    if (error)
                        return "frames." + error;
                }
            }
            if (message.batchTimestamp != null && message.hasOwnProperty("batchTimestamp")) {
                properties._batchTimestamp = 1;
                if (!$util.isInteger(message.batchTimestamp) && !(message.batchTimestamp && $util.isInteger(message.batchTimestamp.low) && $util.isInteger(message.batchTimestamp.high)))
                    return "batchTimestamp: integer|Long expected";
            }
            if (message.centerFreq != null && message.hasOwnProperty("centerFreq")) {
                properties._centerFreq = 1;
                if (typeof message.centerFreq !== "number")
                    return "centerFreq: number expected";
            }
            if (message.sampleRate != null && message.hasOwnProperty("sampleRate")) {
                properties._sampleRate = 1;
                if (typeof message.sampleRate !== "number")
                    return "sampleRate: number expected";
            }
            return null;
        };

        /**
         * Creates a FFTFrameBatch message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof sdr_cockpit.FFTFrameBatch
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {sdr_cockpit.FFTFrameBatch} FFTFrameBatch
         */
        FFTFrameBatch.fromObject = function fromObject(object) {
            if (object instanceof $root.sdr_cockpit.FFTFrameBatch)
                return object;
            let message = new $root.sdr_cockpit.FFTFrameBatch();
            if (object.frames) {
                if (!Array.isArray(object.frames))
                    throw TypeError(".sdr_cockpit.FFTFrameBatch.frames: array expected");
                message.frames = [];
                for (let i = 0; i < object.frames.length; ++i) {
                    if (typeof object.frames[i] !== "object")
                        throw TypeError(".sdr_cockpit.FFTFrameBatch.frames: object expected");
                    message.frames[i] = $root.sdr_cockpit.FFTFrame.fromObject(object.frames[i]);
                }
            }
            if (object.batchTimestamp != null)
                if ($util.Long)
                    (message.batchTimestamp = $util.Long.fromValue(object.batchTimestamp)).unsigned = true;
                else if (typeof object.batchTimestamp === "string")
                    message.batchTimestamp = parseInt(object.batchTimestamp, 10);
                else if (typeof object.batchTimestamp === "number")
                    message.batchTimestamp = object.batchTimestamp;
                else if (typeof object.batchTimestamp === "object")
                    message.batchTimestamp = new $util.LongBits(object.batchTimestamp.low >>> 0, object.batchTimestamp.high >>> 0).toNumber(true);
            if (object.centerFreq != null)
                message.centerFreq = Number(object.centerFreq);
            if (object.sampleRate != null)
                message.sampleRate = Number(object.sampleRate);
            return message;
        };

        /**
         * Creates a plain object from a FFTFrameBatch message. Also converts values to other types if specified.
         * @function toObject
         * @memberof sdr_cockpit.FFTFrameBatch
         * @static
         * @param {sdr_cockpit.FFTFrameBatch} message FFTFrameBatch
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        FFTFrameBatch.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults)
                object.frames = [];
            if (message.frames && message.frames.length) {
                object.frames = [];
                for (let j = 0; j < message.frames.length; ++j)
                    object.frames[j] = $root.sdr_cockpit.FFTFrame.toObject(message.frames[j], options);
            }
            if (message.batchTimestamp != null && message.hasOwnProperty("batchTimestamp")) {
                if (typeof message.batchTimestamp === "number")
                    object.batchTimestamp = options.longs === String ? String(message.batchTimestamp) : message.batchTimestamp;
                else
                    object.batchTimestamp = options.longs === String ? $util.Long.prototype.toString.call(message.batchTimestamp) : options.longs === Number ? new $util.LongBits(message.batchTimestamp.low >>> 0, message.batchTimestamp.high >>> 0).toNumber(true) : message.batchTimestamp;
                if (options.oneofs)
                    object._batchTimestamp = "batchTimestamp";
            }
            if (message.centerFreq != null && message.hasOwnProperty("centerFreq")) {
                object.centerFreq = options.json && !isFinite(message.centerFreq) ? String(message.centerFreq) : message.centerFreq;
                if (options.oneofs)
                    object._centerFreq = "centerFreq";
            }
            if (message.sampleRate != null && message.hasOwnProperty("sampleRate")) {
                object.sampleRate = options.json && !isFinite(message.sampleRate) ? String(message.sampleRate) : message.sampleRate;
                if (options.oneofs)
                    object._sampleRate = "sampleRate";
            }
            return object;
        };

        /**
         * Converts this FFTFrameBatch to JSON.
         * @function toJSON
         * @memberof sdr_cockpit.FFTFrameBatch
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        FFTFrameBatch.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for FFTFrameBatch
         * @function getTypeUrl
         * @memberof sdr_cockpit.FFTFrameBatch
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        FFTFrameBatch.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/sdr_cockpit.FFTFrameBatch";
        };

        return FFTFrameBatch;
    })();

    sdr_cockpit.SpectralMessage = (function() {

        /**
         * Properties of a SpectralMessage.
         * @memberof sdr_cockpit
         * @interface ISpectralMessage
         * @property {sdr_cockpit.SpectralMessage.MessageType|null} [type] SpectralMessage type
         * @property {sdr_cockpit.IFFTFrame|null} [singleFrame] SpectralMessage singleFrame
         * @property {sdr_cockpit.IFFTFrameBatch|null} [batch] SpectralMessage batch
         * @property {Uint8Array|null} [compressedData] SpectralMessage compressedData
         */

        /**
         * Constructs a new SpectralMessage.
         * @memberof sdr_cockpit
         * @classdesc Represents a SpectralMessage.
         * @implements ISpectralMessage
         * @constructor
         * @param {sdr_cockpit.ISpectralMessage=} [properties] Properties to set
         */
        function SpectralMessage(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * SpectralMessage type.
         * @member {sdr_cockpit.SpectralMessage.MessageType} type
         * @memberof sdr_cockpit.SpectralMessage
         * @instance
         */
        SpectralMessage.prototype.type = 0;

        /**
         * SpectralMessage singleFrame.
         * @member {sdr_cockpit.IFFTFrame|null|undefined} singleFrame
         * @memberof sdr_cockpit.SpectralMessage
         * @instance
         */
        SpectralMessage.prototype.singleFrame = null;

        /**
         * SpectralMessage batch.
         * @member {sdr_cockpit.IFFTFrameBatch|null|undefined} batch
         * @memberof sdr_cockpit.SpectralMessage
         * @instance
         */
        SpectralMessage.prototype.batch = null;

        /**
         * SpectralMessage compressedData.
         * @member {Uint8Array|null|undefined} compressedData
         * @memberof sdr_cockpit.SpectralMessage
         * @instance
         */
        SpectralMessage.prototype.compressedData = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * SpectralMessage payload.
         * @member {"singleFrame"|"batch"|"compressedData"|undefined} payload
         * @memberof sdr_cockpit.SpectralMessage
         * @instance
         */
        Object.defineProperty(SpectralMessage.prototype, "payload", {
            get: $util.oneOfGetter($oneOfFields = ["singleFrame", "batch", "compressedData"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Creates a new SpectralMessage instance using the specified properties.
         * @function create
         * @memberof sdr_cockpit.SpectralMessage
         * @static
         * @param {sdr_cockpit.ISpectralMessage=} [properties] Properties to set
         * @returns {sdr_cockpit.SpectralMessage} SpectralMessage instance
         */
        SpectralMessage.create = function create(properties) {
            return new SpectralMessage(properties);
        };

        /**
         * Encodes the specified SpectralMessage message. Does not implicitly {@link sdr_cockpit.SpectralMessage.verify|verify} messages.
         * @function encode
         * @memberof sdr_cockpit.SpectralMessage
         * @static
         * @param {sdr_cockpit.ISpectralMessage} message SpectralMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SpectralMessage.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.type != null && Object.hasOwnProperty.call(message, "type"))
                writer.uint32(/* id 1, wireType 0 =*/8).int32(message.type);
            if (message.singleFrame != null && Object.hasOwnProperty.call(message, "singleFrame"))
                $root.sdr_cockpit.FFTFrame.encode(message.singleFrame, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            if (message.batch != null && Object.hasOwnProperty.call(message, "batch"))
                $root.sdr_cockpit.FFTFrameBatch.encode(message.batch, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
            if (message.compressedData != null && Object.hasOwnProperty.call(message, "compressedData"))
                writer.uint32(/* id 4, wireType 2 =*/34).bytes(message.compressedData);
            return writer;
        };

        /**
         * Encodes the specified SpectralMessage message, length delimited. Does not implicitly {@link sdr_cockpit.SpectralMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof sdr_cockpit.SpectralMessage
         * @static
         * @param {sdr_cockpit.ISpectralMessage} message SpectralMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SpectralMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a SpectralMessage message from the specified reader or buffer.
         * @function decode
         * @memberof sdr_cockpit.SpectralMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {sdr_cockpit.SpectralMessage} SpectralMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SpectralMessage.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.sdr_cockpit.SpectralMessage();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.type = reader.int32();
                        break;
                    }
                case 2: {
                        message.singleFrame = $root.sdr_cockpit.FFTFrame.decode(reader, reader.uint32());
                        break;
                    }
                case 3: {
                        message.batch = $root.sdr_cockpit.FFTFrameBatch.decode(reader, reader.uint32());
                        break;
                    }
                case 4: {
                        message.compressedData = reader.bytes();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a SpectralMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof sdr_cockpit.SpectralMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {sdr_cockpit.SpectralMessage} SpectralMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SpectralMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a SpectralMessage message.
         * @function verify
         * @memberof sdr_cockpit.SpectralMessage
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        SpectralMessage.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            let properties = {};
            if (message.type != null && message.hasOwnProperty("type"))
                switch (message.type) {
                default:
                    return "type: enum value expected";
                case 0:
                case 1:
                case 2:
                    break;
                }
            if (message.singleFrame != null && message.hasOwnProperty("singleFrame")) {
                properties.payload = 1;
                {
                    let error = $root.sdr_cockpit.FFTFrame.verify(message.singleFrame);
                    if (error)
                        return "singleFrame." + error;
                }
            }
            if (message.batch != null && message.hasOwnProperty("batch")) {
                if (properties.payload === 1)
                    return "payload: multiple values";
                properties.payload = 1;
                {
                    let error = $root.sdr_cockpit.FFTFrameBatch.verify(message.batch);
                    if (error)
                        return "batch." + error;
                }
            }
            if (message.compressedData != null && message.hasOwnProperty("compressedData")) {
                if (properties.payload === 1)
                    return "payload: multiple values";
                properties.payload = 1;
                if (!(message.compressedData && typeof message.compressedData.length === "number" || $util.isString(message.compressedData)))
                    return "compressedData: buffer expected";
            }
            return null;
        };

        /**
         * Creates a SpectralMessage message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof sdr_cockpit.SpectralMessage
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {sdr_cockpit.SpectralMessage} SpectralMessage
         */
        SpectralMessage.fromObject = function fromObject(object) {
            if (object instanceof $root.sdr_cockpit.SpectralMessage)
                return object;
            let message = new $root.sdr_cockpit.SpectralMessage();
            switch (object.type) {
            default:
                if (typeof object.type === "number") {
                    message.type = object.type;
                    break;
                }
                break;
            case "SINGLE_FRAME":
            case 0:
                message.type = 0;
                break;
            case "BATCH":
            case 1:
                message.type = 1;
                break;
            case "COMPRESSED_BATCH":
            case 2:
                message.type = 2;
                break;
            }
            if (object.singleFrame != null) {
                if (typeof object.singleFrame !== "object")
                    throw TypeError(".sdr_cockpit.SpectralMessage.singleFrame: object expected");
                message.singleFrame = $root.sdr_cockpit.FFTFrame.fromObject(object.singleFrame);
            }
            if (object.batch != null) {
                if (typeof object.batch !== "object")
                    throw TypeError(".sdr_cockpit.SpectralMessage.batch: object expected");
                message.batch = $root.sdr_cockpit.FFTFrameBatch.fromObject(object.batch);
            }
            if (object.compressedData != null)
                if (typeof object.compressedData === "string")
                    $util.base64.decode(object.compressedData, message.compressedData = $util.newBuffer($util.base64.length(object.compressedData)), 0);
                else if (object.compressedData.length >= 0)
                    message.compressedData = object.compressedData;
            return message;
        };

        /**
         * Creates a plain object from a SpectralMessage message. Also converts values to other types if specified.
         * @function toObject
         * @memberof sdr_cockpit.SpectralMessage
         * @static
         * @param {sdr_cockpit.SpectralMessage} message SpectralMessage
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        SpectralMessage.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults)
                object.type = options.enums === String ? "SINGLE_FRAME" : 0;
            if (message.type != null && message.hasOwnProperty("type"))
                object.type = options.enums === String ? $root.sdr_cockpit.SpectralMessage.MessageType[message.type] === undefined ? message.type : $root.sdr_cockpit.SpectralMessage.MessageType[message.type] : message.type;
            if (message.singleFrame != null && message.hasOwnProperty("singleFrame")) {
                object.singleFrame = $root.sdr_cockpit.FFTFrame.toObject(message.singleFrame, options);
                if (options.oneofs)
                    object.payload = "singleFrame";
            }
            if (message.batch != null && message.hasOwnProperty("batch")) {
                object.batch = $root.sdr_cockpit.FFTFrameBatch.toObject(message.batch, options);
                if (options.oneofs)
                    object.payload = "batch";
            }
            if (message.compressedData != null && message.hasOwnProperty("compressedData")) {
                object.compressedData = options.bytes === String ? $util.base64.encode(message.compressedData, 0, message.compressedData.length) : options.bytes === Array ? Array.prototype.slice.call(message.compressedData) : message.compressedData;
                if (options.oneofs)
                    object.payload = "compressedData";
            }
            return object;
        };

        /**
         * Converts this SpectralMessage to JSON.
         * @function toJSON
         * @memberof sdr_cockpit.SpectralMessage
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        SpectralMessage.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for SpectralMessage
         * @function getTypeUrl
         * @memberof sdr_cockpit.SpectralMessage
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        SpectralMessage.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/sdr_cockpit.SpectralMessage";
        };

        /**
         * MessageType enum.
         * @name sdr_cockpit.SpectralMessage.MessageType
         * @enum {number}
         * @property {number} SINGLE_FRAME=0 SINGLE_FRAME value
         * @property {number} BATCH=1 BATCH value
         * @property {number} COMPRESSED_BATCH=2 COMPRESSED_BATCH value
         */
        SpectralMessage.MessageType = (function() {
            const valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "SINGLE_FRAME"] = 0;
            values[valuesById[1] = "BATCH"] = 1;
            values[valuesById[2] = "COMPRESSED_BATCH"] = 2;
            return values;
        })();

        return SpectralMessage;
    })();

    return sdr_cockpit;
})();

export { $root as default };
