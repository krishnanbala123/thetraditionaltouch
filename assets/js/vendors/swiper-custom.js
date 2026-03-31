//** slide 1 **//
var slide1 = new Swiper(".slide1", {       
  slidesPerView: 1,       
  spaceBetween:24,
  loop: true, 
  speed:1000,
  // autoplay: {
  //   delay: 2000,
  // },
});

//** Hero Intro 1 **//
var heroslide1 = new Swiper('.heroslide1', {
  slidesPerView: 1,     
  spaceBetween: 24,
  loop: true, 
  speed:1000,
  navigation: {
    nextEl: '.swiper-button-next',
    prevEl: '.swiper-button-prev',
  },     
});



//** Porudct slider **//
var toslider = new Swiper(".toslider", {   
    spaceBetween: 10,
    slidesPerView: 3,
    speed:1000,
    autoplay: {
      delay: 2000,
    },
});
var forslider = new Swiper(".forslider", {
    spaceBetween: 0,
    // speed: 1000,
    // autoplay: {
    //   delay: 2000,
    // },
    thumbs: {
        swiper: toslider,
    },
});



//** product slide 4**//
var productslide4 = new Swiper(".productslide4", {       
  slidesPerView: 1,       
  spaceBetween:24,
  loop: true, 
  speed:1000,
  autoplay: {
    delay: 2000,
  },
  // pagination: {            
  //   el: ".swiper-pagination",
  //   clickable: true,
  // },
   breakpoints:{       
      1024: {
        slidesPerView: 4,
      },   
      768: {
        slidesPerView: 2,
      }
    }    
});


//** product slide 5**//
var productslide5 = new Swiper(".productslide5", {
  slidesPerView: 1,       
  spaceBetween:24,
  loop: true, 
  speed:1200,
  autoplay: {
    delay:2000,
  },
  // pagination: {            
  //   el: ".swiper-pagination",
  //   clickable: true,
  // },
   breakpoints:{       
      1400: {
        slidesPerView: 5,
      },   
      1024: {
        slidesPerView: 4,
      },
      768: {
        slidesPerView: 3,
      },
      480: {
        slidesPerView: 2,
      }
    }    
});




//** category slide 6 **//
var categoryslide6 = new Swiper(".categoryslide6", {
  slidesPerView: 1,       
  spaceBetween:16,
  loop: true, 
  speed:1000,
  autoplay: {
    delay: 2000,
  },
  // pagination: {            
  //   el: ".swiper-pagination",
  //   clickable: true,
  // },
   breakpoints:{       
      1400: {
        slidesPerView: 6,
        spaceBetween:24,
      },   
      1200: {
        slidesPerView: 6,
      },
      991: {
        slidesPerView: 5,
        spaceBetween:20,
      },
      420: {
        slidesPerView: 3,
      }
    }    
});


//** category slide 8 **//
var categoryslide8 = new Swiper(".categoryslide8", {       
  slidesPerView: 1,       
  spaceBetween:24,
  loop: true, 
  speed:1000,
  autoplay: {
    delay: 2000,
  },
  // pagination: {            
  //   el: ".swiper-pagination",
  //   clickable: true,
  // },
   breakpoints:{       
      1400: {
        slidesPerView: 8,
      },   
      1280: {
        slidesPerView: 6,
      },
      991: {
        slidesPerView: 5,
      },
      420: {
        slidesPerView: 3,
      }
    }    
});




//** blog slide 4 **//
var blogslide4 = new Swiper(".blogslide4", {       
  slidesPerView: 1,       
  spaceBetween:24,
  loop: true, 
  speed:1000,
  autoplay: {
    delay: 2000,
  },
  // pagination: {            
  //   el: ".swiper-pagination",
  //   clickable: true,
  // },
   breakpoints:{       
      1280: {
        slidesPerView: 4,
      },   
      1024: {
        slidesPerView: 3,
      },
      576: {
        slidesPerView: 2,
      }
    }    
});



//** insta slide 6 **//
var instaslide6 = new Swiper(".instaslide6", {       
  slidesPerView: 2,       
  // spaceBetween:24,
  loop: true, 
  speed:1000,
  // autoplay: {
  //   delay: 2000,
  // },
  // pagination: {            
  //   el: ".swiper-pagination",
  //   clickable: true,
  // },
   breakpoints:{       
      1024: {
        slidesPerView: 6,
      },   
      768: {
        slidesPerView:5,
      },
      576: {
        slidesPerView:4,
      },
      480: {
        slidesPerView:3,
      }
    }    
});






//**testimonial slide 3**//
var testimonialslide3 = new Swiper(".testimonialslide3", {       
  slidesPerView: 1,       
  spaceBetween: 24,       
  loop: true, 
  speed: 1000,
  autoplay: {
    delay: 2000,
  },
  // pagination: {            
  //   el: ".swiper-pagination",
  //   clickable: true,
  // },
   breakpoints:{       
      1024: {
        slidesPerView: 3,
      },   
      768: {
        slidesPerView: 2,
      }
    }    
});




//** brand slide 5 **//
var brandslide5 = new Swiper(".brandslide5", {       
  slidesPerView: 2,       
  spaceBetween:24,
  loop: true, 
  speed:1000, 
  // pagination: {            
  //   el: ".swiper-pagination",
  //   clickable: true,
  // },
   breakpoints:{       
      1400: {
        slidesPerView: 5,
      },   
      1024: {
        slidesPerView:4,
      },
      768: {
        slidesPerView:3,
      },
      480: {
        slidesPerView:3,
      }
    }    
});

//** brand slide 8 **//
var brandslide8 = new Swiper(".brandslide8", {       
  slidesPerView: 2,       
  spaceBetween:24,
  loop: true, 
  speed:1000, 
  // pagination: {            
  //   el: ".swiper-pagination",
  //   clickable: true,
  // },
   breakpoints:{       
      1400: {
        slidesPerView: 8,
      },   
      1024: {
        slidesPerView:6,
      },
      768: {
        slidesPerView:5,
      },
      480: {
        slidesPerView:3,
      }
    }    
});




var courseslider = new Swiper(".courseslider", {       
  slidesPerView: 1,       
  spaceBetween: 18,       
  loop: true, 
  speed:1000,
  autoplay: {
    delay: 2000,
  },
  navigation:{
    nextEl: '.swiper-button-next',
    prevEl: '.swiper-button-prev',
  },
  breakpoints:{       
      1024: {
        slidesPerView: 3,
      },   
      768: {
        slidesPerView: 2,
      }
    }      
});



var aboutslider = new Swiper(".aboutslider", {       
  slidesPerView: 1,       
  spaceBetween: 30,       
  loop: true, 
  speed:1000,
  // pagination: {            
  //   el: ".swiper-pagination",
  //   clickable: true,
  // },    
  autoplay: {
    delay: 2000,
  },
  breakpoints:{       
      1024: {
        slidesPerView: 4,
        spaceBetween: 25,
      },   
      768: {
        slidesPerView: 3,
        spaceBetween: 20,
      },
      320: {
        slidesPerView: 2,
        spaceBetween: 15,
      }
    }    
});




var innerpagelider = new Swiper(".innerpagelider", {       
  slidesPerView: 4,       
  spaceBetween: 30,       
  loop: true, 
  // pagination: {            
  //   el: ".swiper-pagination",
  //   clickable: true,
  // },       
});