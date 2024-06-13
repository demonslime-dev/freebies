import prisma from '@/common/database.js';
import { loginToItchDotIo } from '@/features/auth/itchdotio.auth.js';
import { loginToUnityAssetStore } from '@/features/auth/unityassetstore.auth.js';
import { loginToUnrealMarketPlace } from '@/features/auth/unrealmarketplace.auth.js';
import { ProductType } from '@prisma/client';

const name = process.env.AUTH_NAME;
const email = process.env.AUTH_EMAIL;
const password = process.env.AUTH_PASSWORD;

const { id: userId } = await prisma.user.upsert({
    where: { email },
    create: {
        name,
        email,
        password
    },
    update: {
        name,
        password
    },
});

for (const productType of Object.values(ProductType)) {
    const authenticate = getAuthenticator(productType);
    const storageState = await authenticate(email, password);

    await prisma.productEntry.upsert({
        where: { id: { userId, productType } },
        create: { userId, productType, storageState },
        update: { storageState },
    })
}

function getAuthenticator(productType: ProductType) {
    switch (productType) {
        case ProductType.Itch:
            return loginToItchDotIo
        case ProductType.Unity:
            return loginToUnityAssetStore
        case ProductType.Unreal:
            return loginToUnrealMarketPlace
    }
}
