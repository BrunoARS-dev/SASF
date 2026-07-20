import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common'

type ErrorResponse = {
  code?: string
  message?: string
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp()
    const response = context.getResponse()

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR

    const rawResponse =
      exception instanceof HttpException ? exception.getResponse() : null

    const payload =
      typeof rawResponse === 'object' && rawResponse !== null
        ? (rawResponse as ErrorResponse)
        : null

    response.status(status).json({
      code: payload?.code ?? this.defaultCode(status),
      message: payload?.message ?? this.defaultMessage(status),
    })
  }

  private defaultCode(status: number) {
    if (status === HttpStatus.NOT_FOUND) return 'NOT_FOUND'
    if (status === HttpStatus.UNAUTHORIZED) return 'UNAUTHORIZED'
    if (status === HttpStatus.FORBIDDEN) return 'FORBIDDEN'
    if (status === HttpStatus.BAD_REQUEST) return 'BAD_REQUEST'
    if (status === HttpStatus.NOT_IMPLEMENTED) return 'NOT_IMPLEMENTED'
    return 'INTERNAL_ERROR'
  }

  private defaultMessage(status: number) {
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) return 'Erro interno.'
    return 'Requisição não pôde ser processada.'
  }
}
