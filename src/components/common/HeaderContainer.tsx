const HeaderContainer = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={`lb-flex lb-justify-between ${className}`}>
      {children}
    </div>
  );
};

export default HeaderContainer;
