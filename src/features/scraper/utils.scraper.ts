import prisma from '@/common/database.js';
import { Prisma } from '@prisma/client';

export async function saveProductToDatabase(product: Prisma.ProductCreateInput) {
    await prisma.product.upsert({
        where: { url_saleEndDate: { url: product.url, saleEndDate: product.saleEndDate } },
        update: {},
        create: product
    });
}

export function convertTo24HourFormat(hours: string, minutes: string, period: string | 'AM' | 'PM') {
    let hoursIn24 = parseInt(hours, 10);

    if (period.toUpperCase() === 'PM' && hoursIn24 < 12) hoursIn24 += 12;
    if (period.toUpperCase() === 'AM' && hoursIn24 === 12) hoursIn24 = 0;

    return `${hoursIn24.toString().padStart(2, '0')}:${minutes.padStart(2, '0')}`;
}
