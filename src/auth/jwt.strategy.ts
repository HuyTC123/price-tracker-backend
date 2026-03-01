// src/auth/jwt.strategy.ts
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../prisma/prisma.service";

type JwtPayload = { sub: number; email: string };

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET ?? "super_secret_change_me", // ✅ giống AuthModule
    });
  }

  async validate(payload: JwtPayload) {
    // token phải có sub
    if (!payload?.sub) throw new UnauthorizedException("Invalid token payload");

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true },
    });

    if (!user) throw new UnauthorizedException("User not found");

    // req.user sẽ là object này
    return user;
  }
}
