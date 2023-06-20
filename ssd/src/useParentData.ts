import { useState, useEffect } from 'react'

/**
 * get data from parent
 * @returns data from parent
 */
export const useParentDataChild = <T_parentData = any>(): {
  parentData: T_parentData
} => {
  const [parentData, setParentData] = useState<T_parentData>({} as any)

  useEffect(() => {
    const parent = window.parent
    if (!parent) {
      return () => {}
    }

    parent.postMessage('child-ready', '*')

    const handleParentData = (event: MessageEvent) => {
      setParentData(event.data)
    }

    window.addEventListener('message', handleParentData)

    return () => {
      window.removeEventListener('message', handleParentData)
    }
  }, [])

  return { parentData }
}

/**
 * send data to child
 * @param data - data to send to child
 * @param iframeRef - iframe ref
 * @param T_data - type of data
 */
export const useParentDataParent = <T_data = any>({
  data,
  iframeRef,
}: {
  data: T_data
  iframeRef: React.RefObject<HTMLIFrameElement>
}): void => {
  useEffect(() => {
    const childReadyMessageHandler = (event: MessageEvent) => {
      if (event.data === 'child-ready') {
        if (iframeRef.current) {
          iframeRef.current.contentWindow?.postMessage(data, '*')
        }
        window.removeEventListener('message', childReadyMessageHandler)
      }
    }

    window.addEventListener('message', childReadyMessageHandler)

    return () => {
      window.removeEventListener('message', childReadyMessageHandler)
    }
  }, [data, iframeRef])
}
