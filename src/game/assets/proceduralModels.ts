import * as THREE from 'three';

import {
  createChristmasTree,
  createChristmasHouse,
  createStreetLamp,
  createGiftBox,
  createSnowman,
  createChristmasTrain,
  createReindeer,
  createMarketStall,
  createParkBench,
  createCandyCaneArch,
  createGingerbreadHouse,
  createSleigh,
  createNutcracker,
  createCrystalTree,
  createCarousel,
  createSnowglobe,
  createNorthPoleSign,
  createFireplace,
  createGiantWreath,
  createPeppermintTower,
  createPolarBear,
  createBellTower,
  createGiftPyramid,
  createIceSwan,
  createIlluminatedArch,
  createLogCampfire,
  createToySoldier,
  createSantaMailbox,
  createGoldenAngel,
} from './standardModels';

import {
  createProFerrisWheel,
  createProRollerCoaster,
  createProGrandCarousel,
  createProExpressTrain,
  createProBumperCars,
  createProSwingRide,
  createProHotAirBalloon,
  createProSkatingCouple,
  createProGingerbreadFunhouse,
  createProChurrosCocoaStand,
  createProCarnivalGameBooth,
  createProClockTower,
  createProFireworksLauncher,
  createProLaserProjector,
  createProSnowGlobeDome,
  createProBrassBand,
  createProReindeerCarousel,
  createProIceSlideSled,
  createProCircusTent,
  createProPopcornWagon,
  createProStarArch,
  createProToySoldierParade,
  createProSnowmanJuggler,
  createProLightTunnel,
  createProAnimatedFountain,
  createProWaffleHut,
  createProTreeRide,
  createProSwanBoat,
  createProMarshmallowFire,
  createProFerrisEntrance,
} from './proModels';

export {
  createChristmasTree,
  createChristmasHouse,
  createStreetLamp,
  createGiftBox,
  createSnowman,
  createChristmasTrain,
  createReindeer,
  createMarketStall,
  createParkBench,
  createCandyCaneArch,
  createGingerbreadHouse,
  createSleigh,
  createNutcracker,
  createCrystalTree,
  createCarousel,
  createSnowglobe,
  createNorthPoleSign,
  createFireplace,
  createGiantWreath,
  createPeppermintTower,
  createPolarBear,
  createBellTower,
  createGiftPyramid,
  createIceSwan,
  createIlluminatedArch,
  createLogCampfire,
  createToySoldier,
  createSantaMailbox,
  createGoldenAngel,
  createProFerrisWheel,
  createProRollerCoaster,
  createProGrandCarousel,
  createProExpressTrain,
  createProBumperCars,
  createProSwingRide,
  createProHotAirBalloon,
  createProSkatingCouple,
  createProGingerbreadFunhouse,
  createProChurrosCocoaStand,
  createProCarnivalGameBooth,
  createProClockTower,
  createProFireworksLauncher,
  createProLaserProjector,
  createProSnowGlobeDome,
  createProBrassBand,
  createProReindeerCarousel,
  createProIceSlideSled,
  createProCircusTent,
  createProPopcornWagon,
  createProStarArch,
  createProToySoldierParade,
  createProSnowmanJuggler,
  createProLightTunnel,
  createProAnimatedFountain,
  createProWaffleHut,
  createProTreeRide,
  createProSwanBoat,
  createProMarshmallowFire,
  createProFerrisEntrance,
};

// Factory function to instantiate any asset by ID
export function createAssetObject(assetType: string, colorVariant?: string): THREE.Group {
  switch (assetType) {
    case 'christmas_tree':
      return createChristmasTree();
    case 'christmas_house':
      return createChristmasHouse();
    case 'street_lamp':
      return createStreetLamp();
    case 'gift_box':
      return createGiftBox((colorVariant as 'red' | 'blue' | 'green') || 'red');
    case 'snowman':
      return createSnowman();
    case 'christmas_train':
      return createChristmasTrain();
    case 'reindeer':
      return createReindeer();
    case 'market_stall':
      return createMarketStall();
    case 'park_bench':
      return createParkBench();
    case 'candy_cane_arch':
      return createCandyCaneArch();
    case 'gingerbread_house':
      return createGingerbreadHouse();
    case 'sleigh':
      return createSleigh();
    case 'nutcracker':
      return createNutcracker();
    case 'crystal_tree':
      return createCrystalTree();
    case 'carousel':
      return createCarousel();
    case 'snowglobe':
      return createSnowglobe();
    case 'north_pole_sign':
      return createNorthPoleSign();
    case 'fireplace':
      return createFireplace();
    case 'giant_wreath':
      return createGiantWreath();
    case 'peppermint_tower':
      return createPeppermintTower();
    case 'polar_bear':
      return createPolarBear();
    case 'bell_tower':
      return createBellTower();
    case 'gift_pyramid':
      return createGiftPyramid();
    case 'ice_swan':
      return createIceSwan();
    case 'illuminated_arch':
      return createIlluminatedArch();
    case 'log_campfire':
      return createLogCampfire();
    case 'toy_soldier':
      return createToySoldier();
    case 'santa_mailbox':
      return createSantaMailbox();
    case 'golden_angel':
      return createGoldenAngel();

    // 30 PRO PLAN ASSETS
    case 'pro_ferris_wheel':
      return createProFerrisWheel();
    case 'pro_roller_coaster':
      return createProRollerCoaster();
    case 'pro_grand_carousel':
      return createProGrandCarousel();
    case 'pro_express_train':
      return createProExpressTrain();
    case 'pro_bumper_cars':
      return createProBumperCars();
    case 'pro_swing_ride':
      return createProSwingRide();
    case 'pro_hot_air_balloon':
      return createProHotAirBalloon();
    case 'pro_skating_couple':
      return createProSkatingCouple();
    case 'pro_gingerbread_funhouse':
      return createProGingerbreadFunhouse();
    case 'pro_churros_cocoa_stand':
      return createProChurrosCocoaStand();
    case 'pro_carnival_game_booth':
      return createProCarnivalGameBooth();
    case 'pro_clock_tower':
      return createProClockTower();
    case 'pro_fireworks_launcher':
      return createProFireworksLauncher();
    case 'pro_laser_projector':
      return createProLaserProjector();
    case 'pro_snow_globe_dome':
      return createProSnowGlobeDome();
    case 'pro_brass_band':
      return createProBrassBand();
    case 'pro_reindeer_carousel':
      return createProReindeerCarousel();
    case 'pro_ice_slide_sled':
      return createProIceSlideSled();
    case 'pro_circus_tent':
      return createProCircusTent();
    case 'pro_popcorn_wagon':
      return createProPopcornWagon();
    case 'pro_star_arch':
      return createProStarArch();
    case 'pro_toy_soldier_parade':
      return createProToySoldierParade();
    case 'pro_snowman_juggler':
      return createProSnowmanJuggler();
    case 'pro_light_tunnel':
      return createProLightTunnel();
    case 'pro_animated_fountain':
      return createProAnimatedFountain();
    case 'pro_waffle_hut':
      return createProWaffleHut();
    case 'pro_tree_ride':
      return createProTreeRide();
    case 'pro_swan_boat':
      return createProSwanBoat();
    case 'pro_marshmallow_fire':
      return createProMarshmallowFire();
    case 'pro_ferris_entrance':
      return createProFerrisEntrance();

    default:
      return createGiftBox('red');
  }
}
