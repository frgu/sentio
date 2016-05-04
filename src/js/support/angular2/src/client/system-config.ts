const barrels: string[] = [
  'app',
  'app/+vertical-bars',
  'app/+realtime-timeline',
  'app/+timeline-line',
  'app/routes/+donut',
  'app/routes/+vertical',
  'app/routes/+matrix',
  'app/routes/+realtime',
  'app/routes/+timeline',
  /** @cli-barrel */
];

function createPackageConfig(barrels: string[]): any {
  return barrels.reduce((barrelConfig: any, barrelName: string) => {
    barrelConfig[barrelName] = {
      format: 'register',
      defaultExtension: 'js',
      main: 'index'
    };
    return barrelConfig;
  }, {});
}


// Add your custom SystemJS configuration here.
export const config: any = {
  packages: Object.assign({
    // Add your custom SystemJS packages here.
  }, createPackageConfig(barrels))
};