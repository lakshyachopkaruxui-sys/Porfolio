/** One owner for navigation visibility and mutually exclusive riding prompts. */
export function hybridUIState({ready,inPortfolio,running,modalOpen,previewOpen,hasRoute,speed,nearStop,hintVisible,stopFocused}) {
  const riding=Boolean(ready&&!inPortfolio&&running&&!modalOpen&&!previewOpen);
  const kind=!riding?null:hasRoute?'route':Math.abs(speed)>.05||stopFocused?'riding':nearStop?'nearby':hintVisible?'hint':null;
  return {controls:riding,intro:!inPortfolio&&!running&&!modalOpen&&!previewOpen,reading:!inPortfolio&&Boolean(modalOpen),status:['route','riding'].includes(kind),interact:kind==='nearby',hint:kind==='hint',kind};
}
