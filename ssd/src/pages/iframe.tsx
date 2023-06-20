import React, { useEffect, useRef } from 'react'
import { useParentDataParent } from '../useParentData'

export default function IframePage() {
  const iframe = useRef<HTMLIFrameElement>(null)

  useParentDataParent<{ piperAccessToken: string }>({
    data: { piperAccessToken: '1' },
    iframeRef: iframe,
  })

  return (
    <>
      <iframe
        ref={iframe}
        src="http://localhost:3000/test/query-loan-requests"
        width="100%"
        height="800"
      />
    </>
  )
}
