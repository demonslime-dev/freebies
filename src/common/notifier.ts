import { Prisma } from '@prisma/client';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.MAIL_AUTH_USER,
        pass: process.env.MAIL_AUTH_PASS,
    },
});

export const sendMail = async (to: string, subject: string, message: string) => await transporter.sendMail({
    from: `Freebies <${process.env.MAIL_AUTH_USER}>`,
    to,
    subject: subject,
    text: message,
    html: `<p>${message}</P>`,
});

export async function notifySuccess(to: string, product: Prisma.ProductCreateInput) {
    await sendMail(to, "Claim Success", `Product ${product.title} claimed successfully!`);
}

export async function notifyFailure(to: string, product: Prisma.ProductCreateInput, error: Error) {
    await sendMail(to, "Claim Failed", `Failed to claim the product ${product.title}`);
}
