const Page = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={`lb-p-x-page-default ${className}`}>{children}</div>
  );
};

export default Page;
