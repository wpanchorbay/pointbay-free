const HeaderContainer = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={`pointbay-flex pointbay-justify-between ${className}`}>
      {children}
    </div>
  );
};

export default HeaderContainer;
