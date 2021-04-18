import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FORM_DATA_REQUEST_METADATA_KEY } from '../decorators/form-data';
import { FormDataInterceptorConfig } from '../interfaces/FormDataInterceptorConfig';
import { FormReader } from '../classes/FormReader';
import { of, throwError } from 'rxjs';
import { tap } from 'rxjs/operators';
import { GLOBAL_CONFIG_INJECT_TOKEN } from '../config/global-config-inject-token.config';
import { checkConfig } from '../helpers/check-config';


@Injectable()
export class FormDataInterceptor implements NestInterceptor {

  constructor(@Inject(GLOBAL_CONFIG_INJECT_TOKEN)
              private globalConfig: FormDataInterceptorConfig,
              private reflector: Reflector) {


  }


  async intercept(context: ExecutionContext, next: CallHandler<any>): Promise<any> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    const config: FormDataInterceptorConfig = checkConfig(
      this.reflector.get(FORM_DATA_REQUEST_METADATA_KEY, context.getHandler()) || {},
      this.globalConfig,
    );

    const formReader: FormReader = new FormReader(req, config);

    try {
      req.body = await formReader.handle();
      return next.handle().pipe(tap(res => {
        formReader.deleteFiles();
      }));
    } catch (err) {
      formReader.deleteFiles();

      if (err.status && err.response) {
        res.status(err.status);
        return of(err.response);
      }

      return throwError(err);
    }

  }
}