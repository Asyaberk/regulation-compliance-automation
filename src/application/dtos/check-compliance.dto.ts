import { IsNotEmpty, IsString } from 'class-validator';

export class CheckComplianceDto{
    @IsString()
    @IsNotEmpty({ message: 'Scenerio description is required' })
    scenario: string;
}