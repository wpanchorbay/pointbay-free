const Header = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={`pointbay-text-[20px] pointbay-font-[700] pointbay-leading-[30px] pointbay-text-[#000000]  ${className}`}
    >
      {children}
    </div>
  );
};
export default Header;
