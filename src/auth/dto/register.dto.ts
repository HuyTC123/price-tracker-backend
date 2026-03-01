import { IsEmail, IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class RegisterDto {
  @ApiProperty({ example: "newuser1@gmail.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "123456" })
  @IsString()
  @MinLength(6)
  password: string;
}
