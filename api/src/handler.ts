import { APIGatewayEvent, Context, Handler } from 'aws-lambda';
import * as awsServerlessExpress from 'aws-serverless-express';
import app from './app';

const server = awsServerlessExpress.createServer(app);

export const handler: Handler = (event: APIGatewayEvent, context: Context) => {
  console.log(event);
  console.log(context);
  awsServerlessExpress.proxy(server, event, context);
};
