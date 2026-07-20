import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ApiExceptionFilter } from './common/filters/api-exception.filter'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.enableCors({
    origin: corsOrigin(),
    credentials: true,
  })
  app.setGlobalPrefix('api/v1')
  app.useGlobalFilters(new ApiExceptionFilter())
  await app.listen(process.env.PORT ?? 3001)
}

function corsOrigin() {
  const configuredOrigins = process.env.WEB_ORIGIN?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  if (configuredOrigins && configuredOrigins.length > 0) {
    return configuredOrigins
  }

  return process.env.NODE_ENV === 'production' ? false : true
}

void bootstrap()
