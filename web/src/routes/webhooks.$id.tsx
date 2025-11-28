import { createFileRoute } from '@tanstack/react-router'
import { WebHookDetails } from '../components/webhook-details'
import { Suspense } from 'react'

export const Route = createFileRoute('/webhooks/$id')({
	component: RouteComponent,
})

function RouteComponent() {
	const { id } = Route.useParams()

	return (
		<Suspense fallback={<p>Carregando...</p>}>
			<WebHookDetails id={id} />
		</Suspense>
	)
}
