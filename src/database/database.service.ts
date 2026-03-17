import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class DatabaseService implements OnModuleInit {
    private readonly logger = new Logger(DatabaseService.name);

    constructor(@InjectConnection() private readonly sequelize: Sequelize) { }

    async onModuleInit() {
        try {
            await this.sequelize.authenticate();
            this.logger.log('\x1b[1m\x1b[34m Database connection established successfully FHAAAAAAAAAAA 😱.\x1b[0m',);
        } catch (error) {
        this.logger.error('\x1b[1\x1b[31m Unable to connect to the database Aaaaaagggggggg 🔥.\x1b[0m');
            throw error;
        }
    }
}