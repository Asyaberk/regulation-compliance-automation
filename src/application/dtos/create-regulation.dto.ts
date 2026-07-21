import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';


export class CreateRegulationDto {
    @IsString()
    @IsNotEmpty({ message: 'Title is required' })
    title: string;


    @IsString()
    @IsNotEmpty({ message: 'Raw text is required' })
    content: string;


    @IsString()
    @IsOptional()
    description?: string;


    @IsUrl({}, { message: 'Source URL must be valid' })
    @IsOptional()
    sourceUrl?: string;



}