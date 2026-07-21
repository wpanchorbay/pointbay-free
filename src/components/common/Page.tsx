const Page = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={`loyaltybay-p-x-page-default ${className}`}>{children}</div>
  );
};

export default Page;
