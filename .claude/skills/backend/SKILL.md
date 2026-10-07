---
name: backend
description: Procedures for NestJS development — controllers, services, DTOs, guards, auth, error handling, and API testing
---

# Backend Skill

Use this skill when working on any NestJS code: creating or modifying modules, implementing business logic, writing auth guards, handling errors, or testing API endpoints.

---

## 1. Creating a New Module

```bash
# From apps/api/
nest generate module feature-name
nest generate controller feature-name
nest generate service feature-name
```

Then manually create the `dto/` directory:
```
feature-name/
  feature-name.module.ts
  feature-name.controller.ts
  feature-name.service.ts
  dto/
    create-feature-name.dto.ts
    update-feature-name.dto.ts
    feature-name-response.dto.ts
```

Register the module in `app.module.ts` imports.

---

## 2. Controller Pattern

```typescript
@Controller('jobs')
@UseGuards(JwtAuthGuard)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.FRONT_DESK, UserRole.TECHNICIAN)
  findAll(@Query() query: FindJobsQueryDto): Promise<JobResponseDto[]> {
    return this.jobsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<JobResponseDto> {
    return this.jobsService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.FRONT_DESK)
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateJobDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<JobResponseDto> {
    return this.jobsService.create(dto, user.sub);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateJobStatusDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<JobResponseDto> {
    return this.jobsService.updateStatus(id, dto, user.sub);
  }
}
```

Rules:
- One responsibility per method: validate input → call service → return result.
- Never write `if` blocks containing business logic in a controller.
- Always declare the return type.
- Use `@CurrentUser()` to access the authenticated user — never read `req.user` directly.

---

## 3. Service Pattern

```typescript
@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findOne(id: string): Promise<JobResponseDto> {
    const job = await this.prisma.repairJob.findUnique({
      where: { id },
      include: { customer: true, device: true, assignedTo: true },
    });
    if (!job) throw new NotFoundException(`Job ${id} not found`);
    return this.toResponseDto(job);
  }

  async updateStatus(
    id: string,
    dto: UpdateJobStatusDto,
    userId: string,
  ): Promise<JobResponseDto> {
    const job = await this.findOne(id);
    this.assertValidTransition(job.status, dto.status);

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.repairJob.update({
        where: { id },
        data: { status: dto.status },
      });
      await tx.statusHistory.create({
        data: {
          jobId: id,
          fromStatus: job.status,
          toStatus: dto.status,
          changedById: userId,
          notes: dto.notes,
        },
      });
      return result;
    });

    await this.notificationsService.onStatusChange(updated);
    return this.toResponseDto(updated);
  }

  private assertValidTransition(from: JobStatus, to: JobStatus): void {
    const allowed = VALID_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new BadRequestException(
        `Cannot transition from ${from} to ${to}`,
      );
    }
  }

  private toResponseDto(job: JobWithRelations): JobResponseDto {
    // explicit mapping — never spread a Prisma result directly
  }
}
```

Rules:
- Map Prisma results to response DTOs explicitly — do not `return prismaResult` directly.
- Business rule violations throw `BadRequestException`. Missing records throw `NotFoundException`. Wrong role throws `ForbiddenException`.
- Side effects (notifications, audit writes) happen inside the service, not the controller.
- Use `$transaction` when multiple writes must succeed or fail together.

---

## 4. DTO Pattern

```typescript
// create-job.dto.ts
export class CreateJobDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  intakeNotes: string;

  @IsUUID()
  customerId: string;

  @IsUUID()
  deviceId: string;

  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority = Priority.NORMAL;
}

// job-response.dto.ts — shape what the API returns
export class JobResponseDto {
  id: string;
  jobNumber: string;
  status: JobStatus;
  priority: Priority;
  intakeNotes: string;
  customer: CustomerSummaryDto;
  assignedTo: UserSummaryDto | null;
  createdAt: Date;
  updatedAt: Date;
  // passwordHash, passcode — never included
}
```

Rules:
- Every input DTO uses `class-validator` decorators on every property.
- Response DTOs are explicit classes — not Prisma types, not `Partial<Model>`.
- Never include `passwordHash` or `passcode` in any response DTO.
- Optional properties use `@IsOptional()` before other decorators, not just `?`.

---

## 5. Guard and Auth Pattern

```typescript
// Apply globally in app.module.ts — all routes require JWT unless @Public()
APP_GUARD: JwtAuthGuard

// Apply per-route or per-controller for role restrictions
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)

// Mark a route as public (bypasses JwtAuthGuard)
@Public()
@Post('login')
```

Customer token routes use `CustomerTokenGuard`, not `JwtAuthGuard`. They are declared in the `(customer)` route group and must not share guards with staff routes.

---

## 6. Error Handling Pattern

Throw the correct NestJS exception from the service. The global `HttpExceptionFilter` formats all errors into the response envelope automatically.

| Situation | Exception |
|---|---|
| Record not found | `NotFoundException` |
| Invalid input / bad state | `BadRequestException` |
| No session / expired token | `UnauthorizedException` |
| Wrong role | `ForbiddenException` |
| Duplicate unique field | `ConflictException` |
| Unexpected failure | `InternalServerErrorException` (log the real error first) |

```typescript
// Catching unexpected errors with context
try {
  await this.twilio.sendSms(to, body);
} catch (err) {
  this.logger.error('SMS send failed', { jobId, to, err });
  throw new InternalServerErrorException('Failed to send notification');
}
```

Never propagate raw Prisma errors or third-party SDK errors to the caller.

---

## 7. Implementing a New API Endpoint — Procedure

1. Add the route method to the controller with correct decorators.
2. Create the input DTO with class-validator decorators.
3. Implement the service method with business logic.
4. Create or update the response DTO.
5. Add the service method to the module exports if other modules need it.
6. Write a unit test for the service method (happy path + at least one failure case).
7. Test the endpoint manually with a REST client or the test suite.

---

## 8. API Testing

Integration tests use a real test database. Test file location: `feature.service.spec.ts` co-located with the service.

```typescript
describe('JobsService', () => {
  let service: JobsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    service = module.get(JobsService);
    prisma = module.get(PrismaService);
    await resetTestDatabase(prisma); // truncate + seed
  });

  describe('updateStatus', () => {
    it('writes a StatusHistory record on valid transition', async () => { ... });
    it('throws BadRequestException for invalid transition', async () => { ... });
    it('throws NotFoundException when job does not exist', async () => { ... });
  });
});
```

Run tests after any change to a service:
```bash
cd apps/api && pnpm test
```
