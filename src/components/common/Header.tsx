const Header = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={`loyaltybay-text-[20px] loyaltybay-font-[700] loyaltybay-leading-[30px] loyaltybay-text-[#000000]  ${className}`}
    >
      {children}
    </div>
  );
};
export default Header;
