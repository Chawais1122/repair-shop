import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('Seeding database...');

  // Clear in FK-safe order
  await prisma.payment.deleteMany();
  await prisma.ticketStatusHistory.deleteMany();
  await prisma.repairTicket.deleteMany();
  await prisma.device.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('Password123!', 12);

  // ── Users ──────────────────────────────────────────────────────────────────
  const admin = await prisma.user.create({
    data: { email: 'admin@repairshop.com', passwordHash, name: 'Admin User', role: 'ADMIN' },
  });

  const staff = await prisma.user.create({
    data: { email: 'staff@repairshop.com', passwordHash, name: 'Staff User', role: 'STAFF' },
  });

  const technician = await prisma.user.create({
    data: { email: 'tech@repairshop.com', passwordHash, name: 'Tech User', role: 'TECHNICIAN' },
  });

  // ── Customers ──────────────────────────────────────────────────────────────
  const customer1 = await prisma.customer.create({
    data: { name: 'John Smith', phone: '+15551234567', email: 'john@example.com' },
  });

  const customer2 = await prisma.customer.create({
    data: { name: 'Jane Doe', phone: '+15559876543', email: 'jane@example.com' },
  });

  // ── Devices ────────────────────────────────────────────────────────────────
  const device1 = await prisma.device.create({
    data: {
      customerId: customer1.id,
      type: 'PHONE',
      brand: 'Apple',
      model: 'iPhone 14',
      serialNumber: 'F2LXX1234567',
      imei: '123456789012345',
    },
  });

  const device2 = await prisma.device.create({
    data: {
      customerId: customer2.id,
      type: 'LAPTOP',
      brand: 'Dell',
      model: 'XPS 15',
      serialNumber: 'DXPS9876543',
    },
  });

  // ── Repair Tickets ─────────────────────────────────────────────────────────
  let seq = 1;
  const nextTicketNumber = (): string => `TKT-${String(seq++).padStart(5, '0')}`;

  await prisma.repairTicket.create({
    data: {
      ticketNumber: nextTicketNumber(),
      customerId: customer1.id,
      deviceId: device1.id,
      createdById: staff.id,
      assignedToId: technician.id,
      status: 'DIAGNOSING',
      priority: 'HIGH',
      reportedProblem: 'Screen cracked, touch not responding in bottom half',
      statusHistory: {
        create: [
          { fromStatus: null, toStatus: 'RECEIVED', changedById: staff.id },
          { fromStatus: 'RECEIVED', toStatus: 'DIAGNOSING', changedById: technician.id },
        ],
      },
    },
  });

  await prisma.repairTicket.create({
    data: {
      ticketNumber: nextTicketNumber(),
      customerId: customer2.id,
      deviceId: device2.id,
      createdById: staff.id,
      status: 'RECEIVED',
      priority: 'NORMAL',
      reportedProblem: 'Battery drains very quickly, shuts down at 40%',
      statusHistory: {
        create: [{ fromStatus: null, toStatus: 'RECEIVED', changedById: staff.id }],
      },
    },
  });

  // Suppress unused variable warnings — admin is available for future seed use
  void admin;

  console.log('\nSeeding complete.');
  console.log('Test accounts (password: Password123!):');
  console.log('  admin@repairshop.com  (ADMIN)');
  console.log('  staff@repairshop.com  (STAFF)');
  console.log('  tech@repairshop.com   (TECHNICIAN)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
