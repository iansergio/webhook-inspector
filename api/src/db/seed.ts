import { db } from '.'
import { webhooks } from './schema'
import { faker } from '@faker-js/faker'

// Tipos de eventos comuns do Stripe
const stripeEvents = [
	'charge.succeeded',
	'charge.failed',
	'charge.refunded',
	'payment_intent.succeeded',
	'payment_intent.payment_failed',
	'payment_intent.canceled',
	'invoice.paid',
	'invoice.payment_failed',
	'invoice.created',
	'customer.created',
	'customer.updated',
	'customer.deleted',
	'customer.subscription.created',
	'customer.subscription.updated',
	'customer.subscription.deleted',
	'checkout.session.completed',
	'checkout.session.expired',
	'payment_method.attached',
	'payment_method.detached',
	'payout.paid',
	'payout.failed',
]

// Função para gerar um body realista do Stripe
function generateStripeBody(eventType: string) {
	const baseEvent = {
		id: `evt_${faker.string.alphanumeric(24)}`,
		object: 'event',
		api_version: '2023-10-16',
		created: faker.date.recent({ days: 30 }).getTime() / 1000,
		type: eventType,
		livemode: faker.datatype.boolean(),
	}

	// Gerar dados específicos por tipo de evento
	switch (eventType) {
		case 'charge.succeeded':
		case 'charge.failed':
		case 'charge.refunded':
			return {
				...baseEvent,
				data: {
					object: {
						id: `ch_${faker.string.alphanumeric(24)}`,
						amount: faker.number.int({ min: 1000, max: 50000 }),
						currency: 'usd',
						customer: `cus_${faker.string.alphanumeric(14)}`,
						status: eventType.includes('succeeded') ? 'succeeded' : 'failed',
						receipt_email: faker.internet.email(),
					},
				},
			}

		case 'payment_intent.succeeded':
		case 'payment_intent.payment_failed':
		case 'payment_intent.canceled':
			return {
				...baseEvent,
				data: {
					object: {
						id: `pi_${faker.string.alphanumeric(24)}`,
						amount: faker.number.int({ min: 1000, max: 50000 }),
						currency: 'usd',
						customer: `cus_${faker.string.alphanumeric(14)}`,
						status: eventType.includes('succeeded')
							? 'succeeded'
							: eventType.includes('failed')
								? 'requires_payment_method'
								: 'canceled',
					},
				},
			}

		case 'invoice.paid':
		case 'invoice.payment_failed':
		case 'invoice.created':
			return {
				...baseEvent,
				data: {
					object: {
						id: `in_${faker.string.alphanumeric(24)}`,
						customer: `cus_${faker.string.alphanumeric(14)}`,
						amount_due: faker.number.int({ min: 1000, max: 50000 }),
						currency: 'usd',
						status: eventType.includes('paid') ? 'paid' : 'open',
						hosted_invoice_url: faker.internet.url(),
					},
				},
			}

		case 'customer.created':
		case 'customer.updated':
		case 'customer.deleted':
			return {
				...baseEvent,
				data: {
					object: {
						id: `cus_${faker.string.alphanumeric(14)}`,
						email: faker.internet.email(),
						name: faker.person.fullName(),
						created: faker.date.past().getTime() / 1000,
					},
				},
			}

		case 'customer.subscription.created':
		case 'customer.subscription.updated':
		case 'customer.subscription.deleted':
			return {
				...baseEvent,
				data: {
					object: {
						id: `sub_${faker.string.alphanumeric(24)}`,
						customer: `cus_${faker.string.alphanumeric(14)}`,
						status: eventType.includes('deleted') ? 'canceled' : 'active',
						current_period_start: faker.date.recent().getTime() / 1000,
						current_period_end: faker.date.future().getTime() / 1000,
					},
				},
			}

		case 'checkout.session.completed':
		case 'checkout.session.expired':
			return {
				...baseEvent,
				data: {
					object: {
						id: `cs_${faker.string.alphanumeric(24)}`,
						customer: `cus_${faker.string.alphanumeric(14)}`,
						amount_total: faker.number.int({ min: 1000, max: 50000 }),
						currency: 'usd',
						status: eventType.includes('completed') ? 'complete' : 'expired',
						payment_status: eventType.includes('completed') ? 'paid' : 'unpaid',
					},
				},
			}

		default:
			return {
				...baseEvent,
				data: {
					object: {
						id: faker.string.alphanumeric(24),
					},
				},
			}
	}
}

async function seed() {
	console.log('🌱 Iniciando seed de webhooks...')

	await db.delete(webhooks)

	const webhooksData = []	

	// Gerar 50 webhooks (garantindo pelo menos 45)
	for (let i = 0; i < 55; i++) {
		const eventType = faker.helpers.arrayElement(stripeEvents)
		const statusCode = faker.helpers.weightedArrayElement([
			{ weight: 85, value: 200 },
			{ weight: 10, value: 400 },
			{ weight: 5, value: 500 },
		])

		const bodyObject = generateStripeBody(eventType)
		const bodyString = JSON.stringify(bodyObject, null, 2)

		webhooksData.push({
			method: 'POST',
			pathname: '/api/webhooks/stripe',
			ip: faker.internet.ip(),
			statusCode,
			contentType: 'application/json',
			contentLength: bodyString.length,
			queryParams: {},
			headers: {
				'content-type': 'application/json',
				'stripe-signature': `t=${Date.now()},v1=${faker.string.alphanumeric(64)}`,
				'user-agent': 'Stripe/1.0 (+https://stripe.com/docs/webhooks)',
			},
			body: bodyString,
			createdAt: faker.date.recent({ days: 30 }),
		})
	}

	// Inserir no banco de dados
	await db.insert(webhooks).values(webhooksData)

	console.log(`✅ ${webhooksData.length} webhooks inseridos com sucesso!`)
	console.log('\nDistribuição de eventos:')

	const eventCounts = webhooksData.reduce(
		(acc, webhook) => {
			const bodyObj = JSON.parse(webhook.body)
			const eventType = bodyObj.type
			acc[eventType] = (acc[eventType] || 0) + 1
			return acc
		},
		{} as Record<string, number>,
	)

	Object.entries(eventCounts)
		.sort(([, a], [, b]) => b - a)
		.forEach(([event, count]) => {
			console.log(`  ${event}: ${count}`)
		})
}

seed()
	.catch((error) => {
		console.error('❌ Erro ao executar seed:', error)
		process.exit(1)
	})
	.finally(() => {
		process.exit(0)
	})
