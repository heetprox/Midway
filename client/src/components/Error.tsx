
export default function ErrorPage() {
  return (
    <>
      {/* <Bar /> */}
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-4xl font-bold text-error">Not Found</div>
        <div className="text-xl font-semibold">This page does not exist.</div>
      </div>
    </>
  );
}