import {
  BadRequestError,
  Body,
  BodyParam,
  Controller,
  Get,
  NotFoundError,
  Param,
  Post,
  UseAfter,
  UseBefore,
} from 'routing-controllers';
import TokenModel from '../models/TokenModel';
import TokenMode, { Token } from '../models/TokenModel';
import WalletModel, { Wallet } from '../models/WalletModel';
import { json } from 'body-parser';
import { Service, ServiceModel } from '../models/ServiceModel';
import { TokenService } from '../service/token/TokenService';
import { requiredScopes } from 'express-oauth2-jwt-bearer';
import { jwtCheck } from '../utils/JwtAuth';

interface MintAddressInput {
  toAddress: string;
  value: number;
}

@Controller('/token')
@UseBefore(jwtCheck)
export class TokenController {
  @Get('/')
  @UseAfter(requiredScopes('read:token'))
  getAllTokens(): Promise<Token[]> {
    return TokenModel.getTokens();
  }

  @Get('/:address')
  @UseAfter(requiredScopes('read:token'))
  getToken(@Param('address') address: string): Promise<Token> {
    return TokenModel.getToken(address);
  }

  @Post('/')
  @UseBefore(json())
  @UseAfter(requiredScopes('create:token'))
  async createToken(
    @Body() token: Token,
    @BodyParam('serviceWallet', { required: true }) walletAddress: string,
  ): Promise<Token> {
    const serviceWallet: Wallet = await WalletModel.getWalletByAddress(
      walletAddress,
    );

    return await TokenMode.createToken(token, serviceWallet);
  }

  @Post('/:address/mint')
  @UseAfter(requiredScopes('issue:token'))
  @UseBefore(json())
  async issueToken(
    @Param('address') tokenAddress: string,
    @Body() input: MintAddressInput,
  ): Promise<string> {
    const wallet: Wallet = await WalletModel.getWalletByAddress(
      input.toAddress,
    );
    const token: Token = await TokenModel.getToken(tokenAddress);
    console.log(token);
    if (token.serviceWallet == null) throw new NotFoundError('token not found');
    const service: Service = await ServiceModel.getServiceByAddress(
      token.serviceWallet,
    );

    const tokenController = await TokenService.init(wallet, token, service);
    const hash = await tokenController.issueToken(input.value);

    return hash;
  }

  @Post('/:address/transfer')
  @UseAfter(requiredScopes('transfer:token'))
  @UseBefore(json())
  async sendToken(
    @Param('address') tokenAddress: string,
    @Body() fromAddress: string,
    @Body() toAddress: string,
    @Body() value: number,
  ): Promise<string> {
    const wallet: Wallet = await WalletModel.getWalletByAddress(fromAddress);
    const token: Token = await TokenModel.getToken(tokenAddress);
    const service: Service = await ServiceModel.getServiceByAddress(
      token.address,
    );
    const tokenController = await TokenService.init(wallet, token, service);

    return await tokenController.sendToken(
      await WalletModel.getWalletByAddress(tokenAddress),
      value,
    );
  }
}
