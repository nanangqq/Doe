import React, { useRef } from 'react'
// import { useParentDataParent } from '../useParentData'
import { useParentDataParent } from 'use-parent-data'

export default function IframePage() {
  const iframe = useRef<HTMLIFrameElement>(null)

  type TData = { userId: string }

  useParentDataParent<TData>({
    data: { userId: '1' },
    iframeRef: iframe,
    targetOrigin: 'http://localhost:3000',
  })

  return (
    <>
      <iframe
        ref={iframe}
        src="http://localhost:3000/test/query-loan-requests"
        width="100%"
        height={window.innerHeight}
      />
    </>
  )
}
