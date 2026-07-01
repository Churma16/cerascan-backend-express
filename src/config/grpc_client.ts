import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as path from 'path';

const PROTO_PATH = path.resolve(__dirname, '../proto/ceramic.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
const ceramicProto = protoDescriptor.ceramic;

const GRPC_SERVER_URL = process.env.PYTHON_ML_GRPC_URL || 'localhost:50051';

// initiate grpc instance
export const grpcCeramicClient = new ceramicProto.CeramicService(
    GRPC_SERVER_URL,
    grpc.credentials.createInsecure()
);