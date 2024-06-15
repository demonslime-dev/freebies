import { claimFromItchDotIo } from '@claimer/itchdotio.claimer.js';
import { claimFromUnityAssetStore } from '@claimer/unityassetstore.claimer.js';
import { claimFromUnrealMarketplace } from '@claimer/unrealmarketplace.claimer.js';
import { ProductType } from '@prisma/client';

export function getClaimer(productType: ProductType) {
    switch (productType) {
        case ProductType.Itch:
            return claimFromItchDotIo
        case ProductType.Unity:
            return claimFromUnityAssetStore
        case ProductType.Unreal:
            return claimFromUnrealMarketplace
    }
}
