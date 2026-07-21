const HeaderContainer = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={`loyaltybay-flex loyaltybay-justify-between ${className}`}>
      {children}
    </div>
  );
};

export default HeaderContainer;
