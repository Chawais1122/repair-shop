import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('Seeding database...');

  // Clear in FK-safe order
  await prisma.stockMovement.deleteMany();
  await prisma.ticketItem.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.part.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.repairNote.deleteMany();
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

  const ticket1 = await prisma.repairTicket.create({
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

  const ticket2 = await prisma.repairTicket.create({
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

  // ── Repair Notes ───────────────────────────────────────────────────────────
  await prisma.repairNote.createMany({
    data: [
      {
        ticketId: ticket1.id,
        authorId: technician.id,
        content:
          'LCD digitizer assembly cracked. Touch IC appears intact. Ordering replacement screen.',
        isInternal: true,
      },
      {
        ticketId: ticket1.id,
        authorId: staff.id,
        content: 'Customer informed of estimated cost and repair timeline. Awaiting approval.',
        isInternal: false,
      },
      {
        ticketId: ticket2.id,
        authorId: staff.id,
        content: 'Device checked in. Battery health at 61% — below replacement threshold.',
        isInternal: true,
      },
    ],
  });

  // ── Inventory ──────────────────────────────────────────────────────────────
  const partsSupplier = await prisma.supplier.create({
    data: {
      name: 'Phone Parts Wholesale',
      contactName: 'Sam Lee',
      email: 'orders@phoneparts.example',
      website: 'https://phoneparts.example',
    },
  });

  const partSeeds = [
    {
      sku: 'SCR-IP14',
      name: 'iPhone 14 OLED Screen',
      category: 'Screens',
      cost: '65.00',
      sell: '189.00',
      qty: 4,
    },
    {
      sku: 'SCR-IP13',
      name: 'iPhone 13 OLED Screen',
      category: 'Screens',
      cost: '55.00',
      sell: '169.00',
      qty: 2,
    },
    {
      sku: 'BAT-IP14',
      name: 'iPhone 14 Battery',
      category: 'Batteries',
      cost: '14.00',
      sell: '79.00',
      qty: 10,
    },
    {
      sku: 'BAT-XPS15',
      name: 'Dell XPS 15 Battery',
      category: 'Batteries',
      cost: '38.00',
      sell: '129.00',
      qty: 1,
    },
    {
      sku: 'ACC-USBC-1M',
      name: 'USB-C Cable 1m',
      category: 'Accessories',
      cost: '2.00',
      sell: '14.99',
      qty: 25,
    },
    {
      sku: 'ACC-TG-IP14',
      name: 'Tempered Glass iPhone 14',
      category: 'Accessories',
      cost: '1.20',
      sell: '19.99',
      qty: 0,
    },
  ];

  const parts: Record<string, string> = {};
  for (const p of partSeeds) {
    const part = await prisma.part.create({
      data: {
        sku: p.sku,
        name: p.name,
        category: p.category,
        costPrice: p.cost,
        sellPrice: p.sell,
        quantity: p.qty,
        lowStockThreshold: 3,
        supplierId: partsSupplier.id,
      },
    });
    parts[p.sku] = part.id;
    if (p.qty > 0) {
      await prisma.stockMovement.create({
        data: {
          partId: part.id,
          change: p.qty,
          reason: 'ADJUSTMENT',
          note: 'Opening stock',
          createdById: admin.id,
        },
      });
    }
  }

  // Screen used on the iPhone ticket, plus labor
  const screenLine = await prisma.ticketItem.create({
    data: {
      ticketId: ticket1.id,
      partId: parts['SCR-IP14'],
      description: 'iPhone 14 OLED Screen',
      quantity: 1,
      unitPrice: '189.00',
      unitCost: '65.00',
      createdById: technician.id,
    },
  });
  await prisma.part.update({
    where: { id: parts['SCR-IP14'] },
    data: { quantity: { decrement: 1 } },
  });
  await prisma.stockMovement.create({
    data: {
      partId: parts['SCR-IP14']!,
      change: -1,
      reason: 'TICKET_USAGE',
      referenceId: screenLine.id,
      createdById: technician.id,
    },
  });
  await prisma.ticketItem.create({
    data: {
      ticketId: ticket1.id,
      description: 'Screen replacement labor',
      quantity: 1,
      unitPrice: '40.00',
      createdById: technician.id,
    },
  });

  await prisma.purchaseOrder.create({
    data: {
      poNumber: 'PO-0001',
      supplierId: partsSupplier.id,
      status: 'ORDERED',
      orderedAt: new Date(),
      createdById: admin.id,
      items: {
        create: [
          { partId: parts['ACC-TG-IP14']!, quantity: 20, unitCost: '1.20' },
          { partId: parts['BAT-XPS15']!, quantity: 3, unitCost: '36.50' },
        ],
      },
    },
  });

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
