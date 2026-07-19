const Header = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={`lb-text-[20px] lb-font-[700] lb-leading-[30px] lb-text-[#000000]  ${className}`}
    >
      {children}
    </div>
  );
};
export default Header;
