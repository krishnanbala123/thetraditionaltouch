//*** Loader Show
$(window).on('load', function(){
  $('.codex-loader').fadeOut();
});
$(document).ready(function(){
  
//*** Menu Js 
$(document).on("click",'.menu-action',function(){    
  $(".menu-list").toggleClass('active');
  $("header .cdx-layer").toggleClass('active');
  $(this).toggleClass("toggle-active");
  $('body').toggleClass("overflow-hidden");
  $('.menu-action').removeClass("toggle-active");
});
$(document).on("click",'.close-menu',function(){    
  $(".menu-list").removeClass('active');
  $("header .cdx-layer").removeClass('active');
  $(this).removeClass("toggle-active");
  $('body').removeClass("overflow-hidden");
});
$(".cdx-layer").on( "click", function() {
  $(".menu-list").removeClass('active');
  $(this).removeClass('active');
  $('.menu-action').removeClass("toggle-active");
  $('body').removeClass("overflow-hidden");
});


if($(window).width() < 1200){
  $(".submenu-list,.secodnmenu-list").slideUp('');
  $(".menu-list li.menu-item > a" ).on( "click", function() {      
    $(this).parents('.menu-list').find(".submenu-list").slideUp('');  
    $(this).parents('.menu-list').find(".secodnmenu-list").slideUp('');                
    if($(this).next(".submenu-list").is(':hidden')){
      $(this).next(".submenu-list").slideToggle('');  
    }                
  });
  $(".menu-list li.sub-menu-item > a" ).on( "click", function() {      
    $(this).parents('.menu-list').find(".secodnmenu-list").slideUp('');         
    if($(this).next(".secodnmenu-list").is(':hidden')){
      $(this).next(".secodnmenu-list").slideToggle('');  
    }                
  });
}





//*** Header 
$( ".search-toggle" ).on( "click", function() {
    $(".search-bar").addClass('open');   
});
$( ".clsoe-search" ).on( "click", function() {
    $(".search-bar").removeClass('open');
});


$(".sidebar-action" ).on( "click", function() {
    $(".cdxmenu-list,.doc-sidebar").toggleClass('active');
});



//*** This Class Image Set His Parent Div On background
$('.img-src').css({'display' : 'none'});
$('.img-src').each(function () {
  $(this).parent().css({
    'background-image':'url(' + $(this).attr('src')+ ')',
    'background-size': 'cover',
    'background-position': 'center',
    'display' : 'block'
  }); 
});

  //*** Shop pages 
  $(".proshare-toggle").on( "click", function() {
      $(".share-iconlist").toggleClass('show');
  });
  $(".product-size li , .product-color li, .populartag-list li, .cdx-pagination li").on( "click", function() {
      $(this).addClass('active');
      $(this).siblings().removeClass('active')
  });
  $( ".filter-toggle" ).on( "click", function() {
    $('.filter-sidebar .cdx-sidebar, .filter-sidebar .cdx-layer').addClass('active');
  });
  $( ".filter-sidebar .cdx-layer" ).on( "click", function() {
      $('.filter-sidebar .cdx-sidebar, .filter-sidebar .cdx-layer').removeClass('active');
  });

  $(".filter-sidebar .close-filter" ).on( "click", function() {
      $('.filter-sidebar .cdx-sidebar, .filter-sidebar .cdx-layer').removeClass('active');
  });







  $(document).on("click", ".top-filter .filter-title", function() {                                 
    if(!$(this).next('.filter-list').hasClass('active')){        
      $('.filter-list').removeClass('active');
      $(this).next('.filter-list').addClass('active')
    }else{
      $(this).next('.filter-list').removeClass('active');
    }            
  });

  $('.pro-qty').val(parseInt($('.pro-qty').val()))

  //*** Quantity Counter - START 
  $(document).on('click','.count-plus',function(){
    $(this).siblings('.pro-qty').val(parseInt($(this).siblings('.pro-qty').val()) + 1 );
  });
  $(document).on('click','.count-minus',function(){
    $(this).siblings('.pro-qty').val(parseInt($(this).siblings('.pro-qty').val()) - 1 );
    if ($(this).siblings('.pro-qty').val() == 0) {
      $(this).siblings('.pro-qty').val(1);
    }
  });


  //*** Grid & List View - START 
  $( ".listview-toggle" ).on( "click", function() {
    $('.grid-view-page').addClass('list-view-page').removeClass('grid-view-page');       
  });
  $( ".gridview-toggle" ).on( "click", function() {
    $('.list-view-page').addClass('grid-view-page').removeClass('list-view-page');    
  });

  //*** On Click Remove Table Row- Product Page(Wishlist/Cart)
  $('.cart-action a.delete').on('click',function(){
    $(this).parents('tr').remove()
  });
  $('a.removeAll_cart').on('click',function(){
    $('tbody.cartBody').remove()
  }); 

  //*** Drowpdown Menu
  $(".dropdownmenu .dropdown-action" ).on( "click", function() { 
    if($(".dropdownitem-list").hasClass("open")){
      $('.dropdownitem-list').removeClass('open');  
    }  
    $(this).siblings('.dropdownitem-list').toggleClass('open');   
  });



  //*** Tabs ***//       
  $('.tabs li a').click(function() {
    // $('.tabs li').removeClass('active');
    $(this).parent().siblings().removeClass('active');
    $(this).parent().addClass('active');
    let currentTab = $(this).attr('href');
    // $(this).parent().parent('.tabs').siblings('.tab-contents .tab-item').hide();
    $(this).parent().parent('.tabs').siblings('.tab-contents').children().hide();
    // $('.tab-contents .tab-item').hide();
    $(currentTab).show();
    return false;
  });


  //*** accordion
  $(".accordion-collapace").slideUp('');   
  $(this).next(".accordion-collapace").slideDown('');
  if($(".accordion-action").hasClass("active")) {     
    $(".accordion-action.active").next(".accordion-collapace").slideDown('');
  }
  $(".accordion-grid .accordion-action" ).on( "click", function() {           
    $(this).toggleClass('active');
    $(this).next(".accordion-collapace").slideToggle('');
    $(this).parents().siblings('.accordion-grid').find(".accordion-collapace").slideUp('');
    $(this).parents().siblings('.accordion-grid').find(".accordion-action").removeClass('active');     
  });



  
});

// $(window).on('load', function() {
//   $('.newslatter-popup').modal('show');
// });



$(document).on("click", function(event){ 
  //*** DropdownMenu-Hide
  var $trigger = $(".dropdownmenu , .dropdownitem-list");
  if($trigger !== event.target && !$trigger.has(event.target).length){ 
    if($(".dropdownitem-list").hasClass("open")){
      $('.dropdownitem-list').removeClass('open');  
    }                 
  }  

  //*** SearchBar-Hide
  var $trigger2 = $(".search-bar, .search-toggle, .search-bar.open");
  if($trigger2 !== event.target && !$trigger2.has(event.target).length){ 
    if($(".search-bar").hasClass("open")){
      $('.search-bar').removeClass('open');  
    }                 
  }  

  //*** Menu 
  var $triggermenu = $(".menu-action, .menu-list");
  if($triggermenu !== event.target && !$triggermenu.has(event.target).length){        
    $(".menu-list").removeClass(".open");        
  }    



    
});  

//*** Sticky Header 
  $(window).scroll(function() {
      if($(this).scrollTop() > 50){
          $('header').addClass("sticky");
          $('header.land-header').removeClass("fixed");
      } else {
          $('header').removeClass("sticky");
          $('header.land-header').addClass("fixed");
      }
  });

//*** Back To Top
$(window).scroll(function() {
  if ($(window).scrollTop() > 450) {
    $('.scroll-top').addClass('show');
  } else {
    $('.scroll-top').removeClass('show');
  } 
});
$(document).ready(function(){
  $(document).on("click",'.scroll-top',function(){    
    $('html, body').animate({scrollTop:0}, '450');
  });
});


//*** documantation ***//
$("#sidebar-menu ul li a[href^='#']").on('click', function(e) {
  e.preventDefault();
  var hash = this.hash;
  var header_height = $('.cdx-header').outerHeight();
  console.log(header_height)
  $('html, body').animate({
      scrollTop: $(hash).offset().top - header_height
  }, {
      duration: 500
  });
});




// *** Password Hide Show
$('.toggle-show').click(function(){
  var inp = $('.showhide-password');
  if (inp.attr('type') == 'password') {
    setTimeout(function(){
        inp.attr('type','text');  
        $(".toggle-show").addClass('fa-eye-slash');   
    },250);
    } else {
      setTimeout(function(){
        inp.attr('type','password');;
        $(".toggle-show").removeClass('fa-eye-slash');
      },250);        
    } 
});





//*** sal js
sal({
    'threshold': 0.01,
    // 'once': !![]
      once: false
});



// *** feather icons ***//
 feather.replace()