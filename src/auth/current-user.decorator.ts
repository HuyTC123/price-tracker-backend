import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export type CurrentUser = { id: number; email: string }; // CurrentUser tạo phím tắt lấy thông tin nhanh từ request 

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): CurrentUser => {
    const req = ctx.switchToHttp().getRequest();
    return req.user;
  },
);
