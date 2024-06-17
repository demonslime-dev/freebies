import { Product, ProductType } from '@prisma/client';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.MAIL_AUTH_USER,
        pass: process.env.MAIL_AUTH_PASS,
    },
});

export const sendMail = async (to: string, subject: string, products: Product[]) => await transporter.sendMail({
    from: `Freebies <${process.env.MAIL_AUTH_USER}>`,
    to,
    subject: subject,
    text: generateHtmlMessage(products),
    html: generateHtmlMessage(products),
});

export async function notifyUser(to: string, productType: ProductType, products: Product[], error: string) {
    if (products.length == 0) return;

    if (error) {
        await sendMail(to, `Failed to claim products from ${productType}`, products);
        return;
    }

    await sendMail(to, `Successfully claimed products from ${productType}`, products);
}

export async function notifySuccess(to: string, productType: ProductType, products: Product[]) {
    if (products.length == 0) return;
    await sendMail(to, `Successfully claimed products from ${productType}`, products);
}

export async function notifyFailure(to: string, productType: ProductType, products: Product[]) {
    if (products.length == 0) return;
    await sendMail(to, `Failed to claim products from ${productType}`, products);
}

const generateHtmlMessage = (products: Product[]) => `
<table style="width:100%; border-collapse: collapse; table-layout: auto">
    <colgroup>
        <col style="width: 0;">
        <col style="width: auto;">
        <col style="width: 0;">
    </colgroup>
    <thead>
    <tr style="background-color: #f2f2f2;">
        <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">#</th>
        <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Title</th>
        <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd; white-space: nowrap">Sale End Date</th>
    </tr>
    </thead>
    <tbody>
    ${products.map(({ title, url, saleEndDate }, index) => (`
    <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${index + 1}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">
            <a href="${url}">${title}</a>
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${saleEndDate}</td>
    </tr>
    `)).join('')}
    </tbody>
</table>
`
