exports = module.exports = MigrationModel;

function MigrationModel (title, up, down, num) {
    this.num = num;
    this.title = title;
    this.up = up;
    this.down = down;
}