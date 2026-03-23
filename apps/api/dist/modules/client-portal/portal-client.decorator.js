"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentPortalClient = void 0;
const common_1 = require("@nestjs/common");
exports.CurrentPortalClient = (0, common_1.createParamDecorator)((_data, ctx) => {
    const req = ctx.switchToHttp().getRequest();
    return req['portalClient'];
});
