const Ajv = require('ajv');
const ajv = new Ajv();

const wsMessageSchema = {
    type: 'object',
    properties: {
        msg: { type: 'string', enum: ['streaming', 'connect', 'method', 'pong'] },
        stream_key: { type: 'string' },
        method: { type: 'string' },
        id: { type: 'string' },
        params: {type: 'array' }
    },
    required: ['msg'],
    additionalProperties: true,
    if: {
        properties: { msg: { const: 'streaming' } }
    },
    then: {
        required: ['stream_key']
    },
    else: {
        if: {
            properties: { msg: { const: 'method' } }
        },
        then: {
            required: ['method', 'id', 'params']
        }
    }
};

const wsMessageValidate = ajv.compile(wsMessageSchema);

module.exports = wsMessageValidate;