import { useEffect, useState, type ComponentProps } from 'react'
import { codeToHtml } from 'shiki'
import { twMerge } from 'tailwind-merge'

interface CodeBlockProps extends ComponentProps<'div'> {
	code: string
	lenguage?: string
}

export function CodeBlock({
	className,
	code,
	lenguage = 'json',
	...props
}: CodeBlockProps) {
	const [parsedCode, setParsedCode] = useState('')

	useEffect(() => {
		if (code) {
			codeToHtml(code, { lang: lenguage, theme: 'vesper' }).then((parsed) =>
				setParsedCode(parsed),
			)
		}
	}, [code, lenguage])

	return (
		<div
			className={twMerge(
				'relative rounded-lg border border-zinc-700 overflow-x-auto',
				className,
			)}
			{...props}
		>
			<div
				className="[&_pre]:p-4 [&_pre]:text-sm [&_pre]:font-mono [&_pre]:leading-relaxed"
				dangerouslySetInnerHTML={{ __html: parsedCode }}
			></div>
		</div>
	)
}
