import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseService } from './database.service';
import appConfig from 'src/config/app.config';
import { DatabaseController } from './database.controller';

@Module({
    imports: [
        ConfigModule.forFeature(appConfig),
        SequelizeModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                const dbLogging = configService.get<boolean>('app.db.logging') || false;

                return {
                    dialect: 'postgres',
                    host: configService.get<string>('app.db.host'),
                    port: configService.get<number>('app.db.port'),
                    database: configService.get<string>('app.db.database'),
                    username: configService.get<string>('app.db.username'),
                    password: configService.get<string>('app.db.password'),
                    autoLoadModels: true,
                    synchronize: configService.get<boolean>('app.db.sync') || false,
                    logging: dbLogging ? console.log : false,
                    pool: {
                        max: 5,
                        min: 0,
                        acquire: 30000,
                        idle: 10000,
                    },
                    dialectOptions: {
                        ssl: {
                            require: true,
                            rejectUnauthorized: false
                        }
                    }
                };
            },
        }),
    ],
    controllers: [DatabaseController],
    providers: [DatabaseService],
    exports: [SequelizeModule],
})
export class DatabaseModule { }