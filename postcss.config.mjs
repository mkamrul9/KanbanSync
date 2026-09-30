const fixTailwindV4Vars = () => ({
  postcssPlugin: 'postcss-fix-tailwind-v4-vars',
  Declaration(decl) {
    if (!decl.prop.startsWith('--ks-') && decl.value.includes('--ks-')) {
      decl.value = decl.value.replace(/(?<!var\()(--ks-[a-zA-Z0-9_-]+)/g, 'var($1)');
    }
  },
});
fixTailwindV4Vars.postcss = true;

const config = {
  plugins: [
    '@tailwindcss/postcss',
    fixTailwindV4Vars,
  ],
};

export default config;
