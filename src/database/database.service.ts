import {
    BadRequestException,
    Injectable,
    Logger,
    OnModuleInit,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DatabaseService implements OnModuleInit {
    private readonly logger = new Logger(DatabaseService.name);

    constructor(
        @InjectConnection() private readonly sequelize: Sequelize,
        private readonly configService: ConfigService,
    ) { }

    async onModuleInit() {
        try {
            await this.sequelize.authenticate();
            this.logger.log('\x1b[1m\x1b[34m Database connection established successfully FHAAAAAAAAAAA 😱.\x1b[0m',);
        } catch (error) {
            this.logger.error('\x1b[1\x1b[31m Unable to connect to the database Aaaaaagggggggg 🔥.\x1b[0m');
            throw error;
        }
    }

    async syncDatabaseIfAllowed() {
        const dbSyncEnabled = this.configService.get<boolean>('app.db.sync') || false;
        const dbAlertEnabled = this.configService.get<boolean>('app.db.alert') || false;

        if (!dbSyncEnabled || !dbAlertEnabled) {
            throw new BadRequestException(
                'Database sync is disabled. Enable both DB_SYNC=true and DB_ALERT=true.',
            );
        }

        await this.sequelize.sync({ alter: true });
        return {
            message: 'Database synchronized successfully',
            dbSyncEnabled,
            dbAlertEnabled,
        };
    }
}