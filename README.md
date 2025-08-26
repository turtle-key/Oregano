<p align="center">
    <img src="oregano-banner.png" alt="Oregano theme" width=600/>
</p>
<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white" alt="TypeScript" style="margin-right:4px;"/>
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white" alt="HTML5" style="margin-right:4px;"/>
  <img src="https://img.shields.io/badge/SCSS-CC6699?style=flat&logo=sass&logoColor=white" alt="SCSS" style="margin-right:4px;"/>
  <img src="https://img.shields.io/badge/PHP-777BB4?style=flat&logo=php&logoColor=white" alt="PHP" style="margin-right:4px;"/>
  <img src="https://img.shields.io/badge/MDX-1B1F24?style=flat&logo=mdx&logoColor=white" alt="MDX" style="margin-right:4px;"/>
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black" alt="JavaScript" style="margin-right:4px;"/>
  <img src="https://img.shields.io/badge/Smarty-F0C300?style=flat&logo=smarty&logoColor=black" alt="Smarty" style="margin-right:4px;"/>
</p>
<p align="center">
  <a href="https://hackclub.com/hackatime/">
    <img src="https://hackatime-badge.hackclub.com/U092L97H9LZ/oregano" alt="Hackatime Badge" style="margin-right:4px;"/>
  </a>
  <a href="https://github.com/turtle-key/Oregano/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/turtle-key/Oregano?color=29c469&label=License" alt="License: AGPL-3" style="margin-right:4px;"/>
  </a>
  <a href="https://github.com/turtle-key/TabLift/stargazers">
    <img src="https://img.shields.io/github/stars/turtle-key/Oregano" alt="Stars"/>
  </a>
</p>
Oregano is a custom PrestaShop theme based on the [default PrestaShop theme](https://github.com/PrestaShop/hummingbird).  
It is designed for PrestaShop `9.0.x`, so please make sure you are using that branch to ensure compatibility.


---

## How to Build Assets

Same as the PrestaShop project, you need at least **NodeJS 20.x** and **NPM 8** in order to build the project.

First you need to install every node module:

`npm ci`

then create a `.env` file inside the *webpack* folder by copying `webpack/.env-example` and complete it with your environment's informations. Please use a free tcp port.

then build assets:

`npm run build`

---

## Contributing

We welcome contributions! Please refer to the [Oregano contributing guide](https://github.com/turtle-key/oregano/blob/main/CONTRIBUTING.md) for guidelines.

---

## Continuous Integration

The CI pipeline runs the following checks:  
- Stylelint for CSS/SCSS  
- ESLint for JavaScript  
- TypeScript type checks

---

## License

This theme is released under the [GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE)
</pre>
