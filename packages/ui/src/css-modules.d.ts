// CSS Modules diproses bundler aplikasi (Next, lewat transpilePackages).
declare module "*.module.css" {
  const kelas: Readonly<Record<string, string>>;
  export default kelas;
}
