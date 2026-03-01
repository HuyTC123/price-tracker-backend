import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  private signToken(user: { id: number; email: string }) {
    const payload = { sub: user.id, email: user.email };
    return {
      access_token: this.jwt.sign(payload),
      user: { id: user.id, email: user.email },
    };
  }

  async register(dto: RegisterDto) {
    const email = dto.email?.trim().toLowerCase();
    const password = dto.password;

    if (!email || !password) throw new BadRequestException("Email & password are required");
    if (password.length < 6) throw new BadRequestException("Password must be at least 6 chars");

    const exist = await this.prisma.user.findUnique({ where: { email } });
    if (exist) throw new BadRequestException("Email already exists");

    const hash = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: { email, password: hash },
      select: { id: true, email: true },
    });

    return this.signToken(user);
  }

  async login(dto: LoginDto) {
    const email = dto.email?.trim().toLowerCase();
    const password = dto.password;

    if (!email || !password) throw new BadRequestException("Email & password are required");

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException("Invalid email or password");

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new UnauthorizedException("Invalid email or password");

    return this.signToken({ id: user.id, email: user.email });
  }

  async me(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, createdAt: true, updatedAt: true },
    });
  }
}
