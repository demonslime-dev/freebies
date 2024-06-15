import prisma from '@/common/database.js';
import { Prisma } from '@prisma/client';

export async function SaveProductToDatabase(product: Prisma.ProductCreateInput) {
    await prisma.product.upsert({
        where: { url_saleEndDate: { url: product.url, saleEndDate: product.saleEndDate } },
        update: {},
        create: product
    });
}
